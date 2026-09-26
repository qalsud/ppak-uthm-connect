<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Student;
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
        return Inertia::render('Teacher/Messages', [
            'conversations' => $this->list($request),
            'students' => Student::query()->orderBy('name')->get(['id', 'name', 'class']),
        ]);
    }

    public function openWithStudent(Student $student): RedirectResponse
    {
        $conversation = Conversation::firstOrCreate(
            ['student_id' => $student->id],
            ['teacher_id' => auth()->id()],
        );

        return redirect()->route('teacher.messages.show', $conversation);
    }

    public function show(Request $request, Conversation $conversation): Response
    {
        $conversation->messages()
            ->where('sender_id', '!=', auth()->id())
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        $conversation->load(['student', 'messages.sender:id,name']);

        return Inertia::render('Teacher/Messages', [
            'conversations' => $this->list($request),
            'open' => $conversation,
        ]);
    }

    public function store(Request $request, Conversation $conversation): RedirectResponse
    {
        $validated = $request->validate([
            'body' => 'required|string|max:2000',
        ]);

        if ($conversation->teacher_id === null) {
            $conversation->update(['teacher_id' => auth()->id()]);
        }

        $message = $conversation->messages()->create([
            'sender_id' => auth()->id(),
            'body' => $validated['body'],
        ]);
        $conversation->touch();

        if ($conversation->student->parent_id) {
            Notification::send(
                $conversation->student->parent,
                new MessageReceivedNotification($conversation, auth()->user(), $message->body)
            );
        }

        return back();
    }

    private function list(Request $request): array
    {
        $userId = $request->user()->id;

        return Conversation::with(['student', 'student.parent:id,name', 'latestMessage'])
            ->withCount(['messages as unread_count' => fn ($q) => $q
                ->where('sender_id', '!=', $userId)
                ->whereNull('read_at')])
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (Conversation $c) => [
                'id' => $c->id,
                'student' => $c->student->name ?? '—',
                'parent' => $c->student->parent->name ?? '—',
                'last_message' => $c->latestMessage->first()?->body,
                'unread' => $c->unread_count,
            ])
            ->values()
            ->toArray();
    }
}
