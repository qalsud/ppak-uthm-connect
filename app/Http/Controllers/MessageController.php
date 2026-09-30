<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\Messaging\ConversationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Cross-role message operations: polling, unread count, edit, delete, search.
 */
class MessageController extends Controller
{
    public function __construct(private ConversationService $chat) {}

    /** New messages since `after` (polled while a thread is open). */
    public function updates(Request $request, Conversation $conversation): JsonResponse
    {
        $user = $request->user();
        $this->authorizeConversation($user, $conversation);

        // The thread is open → anything incoming counts as read.
        $this->chat->markRead($conversation, $user);

        $messages = $conversation->messages()
            ->withTrashed()
            ->with(['sender:id,name', 'files'])
            ->where('id', '>', $request->integer('after'))
            ->orderBy('id')
            ->limit(50)
            ->get();

        return response()->json([
            'messages' => $messages,
            'unread' => $this->chat->unreadCountFor($user),
        ]);
    }

    /** Live unread count for the nav/bell badge. */
    public function unread(Request $request): JsonResponse
    {
        return response()->json(['count' => $this->chat->unreadCountFor($request->user())]);
    }

    public function update(Request $request, Message $message): RedirectResponse
    {
        $user = $request->user();
        $this->authorizeMessage($user, $message);

        abort_if($message->trashed(), 403);
        abort_if($message->sender_id !== $user->id, 403);
        abort_if($message->type !== Message::TYPE_USER, 403);
        abort_if($message->created_at->diffInMinutes(now()) > (int) setting('operations.message_edit_minutes', 15), 403);

        $data = $request->validate([
            'body' => ['required', 'string', 'max:'.(int) setting('operations.message_max_length', 2000)],
        ]);

        $message->update(['body' => $data['body'], 'edited_at' => now()]);

        return back();
    }

    public function destroy(Request $request, Message $message): RedirectResponse
    {
        $user = $request->user();
        $this->authorizeMessage($user, $message);

        abort_unless($message->sender_id === $user->id || $user->isAdmin(), 403);

        // Keep a placeholder in the thread.
        $message->forceFill(['body' => '', 'edited_at' => null])->save();
        $message->delete();

        return back();
    }

    /** Search message bodies (role-scoped). */
    public function search(Request $request): JsonResponse
    {
        $query = trim((string) $request->query('q', ''));

        if (mb_strlen($query) < 2) {
            return response()->json(['results' => []]);
        }

        $user = $request->user();

        $messages = Message::query()
            ->with(['conversation.student:id,name,class', 'sender:id,name'])
            ->where('type', Message::TYPE_USER)
            ->where('body', 'like', "%{$query}%")
            ->when($user->isParent(), fn ($q) => $q->whereHas(
                'conversation',
                fn ($w) => $w->whereIn('student_id', $user->students()->pluck('id'))
            ))
            ->when(
                $user->isTeacher() && $user->assignedClass(),
                fn ($q) => $q->whereHas('conversation.student', fn ($w) => $w->where('class', $user->assignedClass()))
            )
            ->orderByDesc('id')
            ->limit(20)
            ->get();

        return response()->json([
            'results' => $messages->map(fn (Message $message) => [
                'id' => $message->id,
                'student' => $message->conversation?->student?->name ?? '—',
                'sender' => $message->sender?->name ?? '—',
                'snippet' => mb_substr($message->body, 0, 90),
                'date' => $message->sent_date,
                'url' => $this->conversationUrl($user, (int) $message->conversation_id),
            ])->values(),
        ]);
    }

    private function conversationUrl(User $user, int $conversationId): string
    {
        return match (true) {
            $user->isAdmin() => route('admin.conversations.show', $conversationId, absolute: false),
            $user->isTeacher() => route('teacher.messages.show', $conversationId, absolute: false),
            default => route('parent.messages.show', $conversationId, absolute: false),
        };
    }

    private function authorizeConversation(User $user, Conversation $conversation): void
    {
        $conversation->loadMissing('student');
        $student = $conversation->student;

        abort_unless($student, 404);

        $allowed = $user->isAdmin()
            || ($user->isParent() && $student->parent_id === $user->id)
            || ($user->isTeacher() && $user->canManage($student));

        abort_unless($allowed, 403);
    }

    private function authorizeMessage(User $user, Message $message): void
    {
        $message->loadMissing('conversation.student');
        $this->authorizeConversation($user, $message->conversation);
    }
}
