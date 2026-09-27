<?php

namespace App\Http\Controllers\Parent;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Student;
use App\Models\User;
use App\Notifications\MessageReceivedNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;
use Inertia\Response;

class MessageController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Parent/Messages', [
            'conversations' => $this->list($request),
            'students' => $request->user()->students()->active()->orderBy('name')->get(['id', 'name', 'class']),
        ]);
    }

    public function openWithStudent(Request $request, Student $student): RedirectResponse
    {
        abort_unless($student->parent_id === $request->user()->id, 403);

        $conversation = Conversation::firstOrCreate(['student_id' => $student->id]);

        return redirect()->route('parent.messages.show', $conversation);
    }

    public function show(Request $request, Conversation $conversation): Response
    {
        abort_unless($conversation->student->parent_id === auth()->id(), 403);

        // Mark inbound messages as read.
        $conversation->messages()
            ->where('sender_id', '!=', auth()->id())
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        $conversation->load(['student', 'messages.sender:id,name']);

        return Inertia::render('Parent/Messages', [
            'conversations' => $this->list($request),
            'open' => $conversation,
        ]);
    }

    public function store(Request $request, Conversation $conversation): RedirectResponse
    {
        abort_unless($conversation->student->parent_id === auth()->id(), 403);

        $validated = $request->validate([
            'body' => 'required|string|max:2000',
        ]);

        $message = $conversation->messages()->create([
            'sender_id' => auth()->id(),
            'body' => $validated['body'],
        ]);
        $conversation->touch();

        $notification = new MessageReceivedNotification($conversation, auth()->user(), $message->body);

        if ($conversation->teacher_id) {
            Notification::send($conversation->teacher, $notification);
        } else {
            // Not yet assigned to a teacher — notify the teaching team.
            $teachers = User::query()
                ->where('role', UserRole::Teacher)
                ->where('status', AccountStatus::Active)
                ->get();

            Notification::send($teachers, $notification);
        }

        return back();
    }

    private function list(Request $request): array
    {
        $studentIds = $request->user()->students()->pluck('id');

        return Conversation::with(['student', 'latestMessage'])
            ->withCount(['messages as unread_count' => fn ($q) => $q
                ->where('sender_id', '!=', $request->user()->id)
                ->whereNull('read_at')])
            ->whereIn('student_id', $studentIds)
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (Conversation $c) => [
                'id' => $c->id,
                'student' => $c->student->name ?? '—',
                'last_message' => $c->latestMessage->first()?->body,
                'unread' => $c->unread_count,
            ])
            ->values()
            ->toArray();
    }
}
