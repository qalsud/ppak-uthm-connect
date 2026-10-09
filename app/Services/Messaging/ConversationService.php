<?php

namespace App\Services\Messaging;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Events\MessageSent;
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
            'closed' => $conversation->isClosed(),
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
            $recipients = $this->recipientsFor($conversation, $sender);

            $this->notify($conversation, $sender, $message, $recipients);
            MessageSent::dispatch($message, $recipients->pluck('id')->all());
        }

        return $message;
    }

    /**
     * Who should hear about a message from `$sender`: a parent's message goes to
     * the class's active teachers; anyone else's goes to the child's parent.
     *
     * @return Collection<int, User>
     */
    public function recipientsFor(Conversation $conversation, User $sender): Collection
    {
        if ($sender->isParent()) {
            return $this->teachersFor($conversation);
        }

        $parent = $conversation->student?->parent;

        return $parent ? collect([$parent]) : collect();
    }

    /**
     * Notify the opposite side of the conversation.
     *
     * @param  Collection<int, User>|null  $recipients
     */
    public function notify(Conversation $conversation, User $sender, Message $message, ?Collection $recipients = null): void
    {
        $recipients ??= $this->recipientsFor($conversation, $sender);

        if ($recipients->isEmpty()) {
            return;
        }

        Notification::send($recipients, new MessageReceivedNotification($conversation, $sender, $message->body));
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

        $student = $conversation->student;
        $class = $student?->class;
        $centreId = $student?->centre_id;

        // Only teachers who actually work at the child's centre — a class key
        // like "5tahun" exists at EVERY centre, so without this the message
        // would reach the same-named class at the other centre.
        return (clone $base)
            ->when($centreId, fn ($q) => $q->where(fn ($w) => $w
                ->whereHas('centres', fn ($c) => $c->where('centres.id', $centreId))
                ->orWhereDoesntHave('centres') // unassigned = unrestricted
            ))
            ->when($class, fn ($q) => $q->where(fn ($w) => $w->where('class', $class)->orWhereNull('class')))
            ->get();
    }

    /**
     * Active teachers an admin may assign to a conversation — scoped to the
     * child's centre (plus unassigned/unrestricted staff).
     *
     * @return Collection<int, User>
     */
    public function reassignableTeachers(Conversation $conversation): Collection
    {
        $centreId = $conversation->student?->centre_id;

        return User::query()
            ->where('role', UserRole::Teacher)
            ->where('status', AccountStatus::Active)
            ->when($centreId, fn ($q) => $q->where(fn ($w) => $w
                ->whereHas('centres', fn ($c) => $c->where('centres.id', $centreId))
                ->orWhereDoesntHave('centres')
            ))
            ->orderBy('name')
            ->get(['id', 'name']);
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
            $query->whereHas('conversation.student', fn ($q) => $q
                ->visibleTo($user)
                ->where('class', $user->assignedClass()));
        }

        return $query->count();
    }
}
