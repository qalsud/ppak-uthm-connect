<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\Messaging\ConversationService;
use Illuminate\Http\Request;
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
            ]);

        return Inertia::render('Admin/Conversations', [
            'conversations' => $conversations,
            'filters' => ['search' => $search],
        ]);
    }

    public function show(Request $request, Conversation $conversation): Response
    {
        return Inertia::render('Admin/Conversation', [
            'conversation' => $this->chat->thread($conversation, $request->integer('before') ?: null),
        ]);
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
