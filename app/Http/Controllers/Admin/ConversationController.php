<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\Messaging\ConversationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ConversationController extends Controller
{
    public function __construct(private ConversationService $chat) {}

    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));

        $conversations = Conversation::query()
            ->with(['student:id,name,class', 'student.parent:id,name', 'teacher:id,name', 'latestMessage'])
            ->withCount('messages')
            ->when($search !== '', fn ($q) => $q->whereHas(
                'student',
                fn ($w) => $w->where('name', 'like', "%{$search}%")
            ))
            ->orderByDesc('updated_at')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Conversation $c) => [
                'id' => $c->id,
                'student' => $c->student?->name ?? '—',
                'class' => $c->student?->class,
                'parent' => $c->student?->parent?->name,
                'teacher' => $c->teacher?->name,
                'messages_count' => $c->messages_count,
                'last_message' => $c->latestMessage?->body,
                'last_date' => $c->latestMessage?->sent_date,
                'closed' => $c->isClosed(),
            ]);

        return Inertia::render('Admin/Conversations', [
            'conversations' => $conversations,
            'filters' => ['search' => $search],
        ]);
    }

    public function show(Request $request, Conversation $conversation): Response
    {
        $conversation->loadMissing('student');

        return Inertia::render('Admin/Conversation', [
            'conversation' => $this->chat->thread($conversation, $request->integer('before') ?: null),
            'teachers' => $this->chat->reassignableTeachers($conversation),
        ]);
    }

    /** Send a message into any thread, as the admin. */
    public function send(Request $request, Conversation $conversation): RedirectResponse
    {
        if ($conversation->isClosed()) {
            return back()->with('error', __('conversation_closed'));
        }

        $data = $request->validate([
            'body' => [
                'nullable', 'string',
                'max:'.(int) setting('operations.message_max_length', 2000),
                'required_without:attachments',
            ],
            'attachments' => ['nullable', 'array', 'max:'.(int) setting('operations.message_attachment_limit', 3)],
            'attachments.*' => [
                'image', 'mimes:jpg,jpeg,png,webp',
                'max:'.(int) setting('media.max_upload_kb', config('media.max_upload_kb')),
            ],
        ]);

        $this->chat->post(
            $conversation,
            $request->user(),
            $data['body'] ?? '',
            $request->file('attachments') ?? [],
        );

        ActivityLog::record('conversation.replied', $conversation, $conversation->student?->name);

        return back();
    }

    /** Reassign the thread to another (centre-appropriate) teacher. */
    public function reassign(Request $request, Conversation $conversation): RedirectResponse
    {
        $data = $request->validate([
            'teacher_id' => ['required', 'integer', Rule::exists('users', 'id')->where('role', UserRole::Teacher->value)],
        ]);

        $allowed = $this->chat->reassignableTeachers($conversation)->pluck('id');

        if (! $allowed->contains((int) $data['teacher_id'])) {
            throw ValidationException::withMessages([
                'teacher_id' => __('conversation_teacher_invalid'),
            ]);
        }

        $conversation->update(['teacher_id' => $data['teacher_id']]);

        ActivityLog::record('conversation.reassigned', $conversation, $conversation->student?->name, [
            'teacher_id' => $data['teacher_id'],
        ]);

        return back()->with('success', __('approval.conversation_reassigned'));
    }

    /** Close (archive) the thread — reversible. */
    public function close(Conversation $conversation): RedirectResponse
    {
        $conversation->update(['closed_at' => now()]);

        ActivityLog::record('conversation.closed', $conversation, $conversation->student?->name);

        return back()->with('success', __('approval.conversation_closed'));
    }

    public function reopen(Conversation $conversation): RedirectResponse
    {
        $conversation->update(['closed_at' => null]);

        ActivityLog::record('conversation.reopened', $conversation, $conversation->student?->name);

        return back()->with('success', __('approval.conversation_reopened'));
    }

    /** Full transcript export for record-keeping. */
    public function export()
    {
        $messages = Message::query()
            ->withTrashed()
            ->with(['conversation.student:id,name', 'sender:id,name'])
            ->orderBy('id')
            ->get();

        return response()->streamDownload(function () use ($messages) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Date', 'Student', 'Sender', 'Type', 'Message']);

            foreach ($messages as $message) {
                fputcsv($out, [
                    $message->created_at?->format('Y-m-d H:i'),
                    $message->conversation?->student?->name ?? '',
                    $message->sender?->name ?? '',
                    $message->type,
                    $message->trashed() ? '[deleted]' : $message->body,
                ]);
            }

            fclose($out);
        }, 'conversations.csv', ['Content-Type' => 'text/csv']);
    }
}
