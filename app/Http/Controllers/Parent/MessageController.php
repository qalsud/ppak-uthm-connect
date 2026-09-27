<?php

namespace App\Http\Controllers\Parent;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Student;
use App\Models\User;
use App\Services\Messaging\ConversationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class MessageController extends Controller
{
    public function __construct(private ConversationService $chat) {}

    public function index(Request $request): Response
    {
        return Inertia::render('Parent/Messages', [
            'conversations' => $this->chat->listFor($request->user()),
            'students' => $this->students($request),
            'open' => null,
        ]);
    }

    public function openWithStudent(Request $request, Student $student): RedirectResponse
    {
        abort_unless($student->parent_id === $request->user()->id, 403);

        return redirect()->route('parent.messages.show', $this->chat->conversationFor($student));
    }

    public function show(Request $request, Conversation $conversation): Response
    {
        $this->authorizeConversation($request->user(), $conversation);
        $this->chat->markRead($conversation, $request->user());

        return Inertia::render('Parent/Messages', [
            'conversations' => $this->chat->listFor($request->user()),
            'students' => $this->students($request),
            'open' => $this->chat->thread($conversation, $request->integer('before') ?: null),
        ]);
    }

    public function store(Request $request, Conversation $conversation): RedirectResponse
    {
        $this->authorizeConversation($request->user(), $conversation);

        $validated = $request->validate([
            'body' => ['nullable', 'string', 'max:2000', 'required_without:attachments'],
            'attachments' => ['nullable', 'array', 'max:3'],
            'attachments.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:'.(int) config('media.max_upload_kb')],
        ]);

        try {
            $this->chat->post(
                $conversation,
                $request->user(),
                (string) ($validated['body'] ?? ''),
                $request->file('attachments') ?? [],
            );
        } catch (RuntimeException) {
            return back()->with('error', __('approval.photo_invalid'));
        }

        return back();
    }

    private function students(Request $request): Collection
    {
        return $request->user()->students()->active()->orderBy('name')->get(['id', 'name', 'class']);
    }

    private function authorizeConversation(User $user, Conversation $conversation): void
    {
        $conversation->loadMissing('student');

        abort_unless($conversation->student?->parent_id === $user->id, 403);
    }
}
