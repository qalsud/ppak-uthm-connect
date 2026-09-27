<?php

namespace App\Services\Messaging;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessageAttachment;
use App\Models\Student;
use App\Models\User;
use App\Notifications\MessageReceivedNotification;
use App\Services\Images\ImageStore;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification;

class ConversationService
{
    public function __construct(private ImageStore $images) {}

    public function conversationFor(Student $student): Conversation
    {
        return Conversation::firstOrCreate(['student_id' => $student->id]);
    }

    /** Role-aware inbox list. */
    public function listFor(User $user): array
    {
        $query = Conversation::query()
            ->with(['student:id,name,class', 'student.parent:id,name', 'teacher:id,name', 'latestMessage'])
            ->withCount(['messages as unread_count' => fn ($q) => $q
                ->where('sender_id', '!=', $user->id)
                ->whereNull('read_at')]);

        if ($user->isParent()) {
            $query->whereIn('student_id', $user->students()->pluck('id'));
        } elseif ($user->isTeacher() && $user->assignedClass()) {
            $query->whereHas('student', fn ($s) => $s->where('class', $user->assignedClass()));
        }

        return $query->orderByDesc('updated_at')->get()->map(fn (Conversation $c) => [
            'id' => $c->id,
            'student' => $c->student->name ?? '—',
            'class' => $c->student?->class,
            'parent' => $c->student?->parent?->name,
            'teacher' => $c->teacher?->name,
            'last_message' => $c->latestMessage?->body,
            'last_type' => $c->latestMessage?->type,
            'last_time' => $c->latestMessage?->sent_time,
            'last_date' => $c->latestMessage?->sent_date,
            'unread' => $c->unread_count,
        ])->values()->all();
    }

    /** Thread payload, oldest → newest, with pagination. */
    public function thread(Conversation $conversation, ?int $before = null, int $perPage = 30): array
    {
        $conversation->loadMissing(['student', 'teacher:id,name']);

        $query = $conversation->messages()
            ->withTrashed()
            ->with(['sender:id,name', 'files']);

        if ($before) {
            $query->where('id', '<', $before);
        }

        $messages = $query->orderByDesc('id')->limit($perPage + 1)->get();
        $hasMore = $messages->count() > $perPage;
        $messages = $messages->take($perPage)->reverse()->values();

        return [
            'id' => $conversation->id,
            'student' => [
                'id' => $conversation->student->id,
                'name' => $conversation->student->name,
                'class' => $conversation->student->class,
            ],
            'teacher' => $conversation->teacher
                ? ['id' => $conversation->teacher->id, 'name' => $conversation->teacher->name]
                : null,
            'messages' => $messages,
            'has_more' => $hasMore,
            'oldest_id' => $messages->first()?->id,
        ];
    }

    public function markRead(Conversation $conversation, User $user): void
    {
        $conversation->messages()
            ->where('sender_id', '!=', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }

    /**
     * Post a message (optionally with image attachments) and notify the
     * other side.
     *
     * @param  array<int, UploadedFile|null>  $files
     */
    public function post(
        Conversation $conversation,
        User $sender,
        string $body,
        array $files = [],
        string $type = Message::TYPE_USER,
        bool $notify = true,
        array $meta = [],
    ): Message {
        if ($conversation->teacher_id === null && $sender->isTeacher()) {
            $conversation->update(['teacher_id' => $sender->id]);
        }

        $message = $conversation->messages()->create([
            'sender_id' => $sender->id,
            'body' => $body,
            'type' => $type,
            ...$meta,
        ]);

        foreach (array_filter($files) as $file) {
            $stored = $this->images->store($file, 'messages');

            MessageAttachment::create([
                'message_id' => $message->id,
                'student_id' => $conversation->student_id,
                'disk' => $stored->disk,
                'path' => $stored->path,
                'thumb_path' => $stored->thumbPath,
                'original_name' => $file->getClientOriginalName(),
                'mime' => $stored->mime,
                'size' => $stored->size,
                'width' => $stored->width,
                'height' => $stored->height,
                'uploaded_by' => $sender->id,
            ]);
        }

        $conversation->touch();
        $message->unsetRelation('files');

        if ($notify) {
            $this->notify($conversation, $sender, $message);
        }

        return $message;
    }

    /** Notify the opposite side of the conversation. */
    public function notify(Conversation $conversation, User $sender, Message $message): void
    {
        $notification = new MessageReceivedNotification($conversation, $sender, $message->body);

        if ($sender->isParent()) {
            $teachers = $this->teachersFor($conversation);

            if ($teachers->isNotEmpty()) {
                Notification::send($teachers, $notification);
            }

            return;
        }

        $parent = $conversation->student?->parent;

        if ($parent) {
            Notification::send($parent, $notification);
        }
    }

    /**
     * Active teachers who should get a parent's message: the assigned teacher
     * when they are still active, otherwise every active teacher for the class.
     *
     * @return Collection<int, User>
     */
    public function teachersFor(Conversation $conversation): Collection
    {
        $base = User::query()->where('role', UserRole::Teacher)->where('status', AccountStatus::Active);

        if ($conversation->teacher_id) {
            $assigned = (clone $base)->whereKey($conversation->teacher_id)->get();

            if ($assigned->isNotEmpty()) {
                return $assigned;
            }
        }

        $class = $conversation->student?->class;

        return (clone $base)
            ->when($class, fn ($q) => $q->where(fn ($w) => $w->where('class', $class)->orWhereNull('class')))
            ->get();
    }

    /** Unread inbound messages for a user (drives the nav/bell badge). */
    public function unreadCountFor(User $user): int
    {
        $query = Message::query()
            ->whereNull('read_at')
            ->where('sender_id', '!=', $user->id);

        if ($user->isParent()) {
            $query->whereHas('conversation', fn ($q) => $q->whereIn('student_id', $user->students()->pluck('id')));
        } elseif ($user->isTeacher() && $user->assignedClass()) {
            $query->whereHas('conversation.student', fn ($q) => $q->where('class', $user->assignedClass()));
        }

        return $query->count();
    }
}
