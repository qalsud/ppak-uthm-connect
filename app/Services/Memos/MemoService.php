<?php

namespace App\Services\Memos;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\ActivityLog;
use App\Models\Memo;
use App\Models\Student;
use App\Models\User;
use App\Notifications\MemoPostedNotification;
use App\Services\Images\ImageStore;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification;

/**
 * Publishing a memo is shared by the admin and teacher screens. Keeping the
 * recipient calculation here means a class memo notifies exactly the families
 * who can see it, no matter which role created it.
 */
class MemoService
{
    public function __construct(private ImageStore $images) {}

    /**
     * @param  array<string, mixed>  $data
     * @param  array<int, UploadedFile|null>  $files
     */
    public function create(User $author, array $data, array $files = []): Memo
    {
        $memo = Memo::create([
            ...$data,
            'author_id' => $author->id,
        ]);

        $this->storeAttachments($memo, $files, $author);

        if ($memo->notify_users) {
            Notification::send($this->recipients($memo), new MemoPostedNotification($memo));
        }

        ActivityLog::record('memo.created', $memo, $memo->title, ['audience' => $memo->audience]);

        return $memo;
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array<int, UploadedFile|null>  $files
     * @param  array<int, int|string>  $remove
     */
    public function update(Memo $memo, User $editor, array $data, array $files = [], array $remove = []): Memo
    {
        $memo->update($data);

        $this->removeAttachments($memo, $remove);
        $this->storeAttachments($memo, $files, $editor);

        ActivityLog::record('memo.updated', $memo, $memo->title, ['audience' => $memo->audience]);

        return $memo;
    }

    /**
     * Everyone who should be notified about the memo. Mirrors Memo::visibleTo
     * so a recipient can always open the memo they were told about.
     *
     * @return Collection<int, User>
     */
    public function recipients(Memo $memo): Collection
    {
        $active = User::query()->where('status', AccountStatus::Active);

        // Restrict to the memo's centre when it has one.
        $inCentre = fn ($q) => $memo->centre_id
            ? $q->where(fn ($w) => $w
                ->whereHas('centres', fn ($c) => $c->where('centres.id', $memo->centre_id))
                ->orWhereDoesntHave('centres'))
            : $q;

        return match ($memo->audience) {
            'parents' => $inCentre((clone $active)->where('role', UserRole::Parent))->get(),
            'teachers' => $inCentre((clone $active)->where('role', UserRole::Teacher))->get(),
            'class' => (clone $active)
                ->whereIn('role', [UserRole::Parent, UserRole::Teacher])
                ->where(function ($q) use ($memo) {
                    // Parents of that class (in the memo's centre)...
                    $q->orWhereIn('id', Student::query()
                        ->select('parent_id')
                        ->whereNotNull('parent_id')
                        ->where('class', $memo->class)
                        ->when($memo->centre_id, fn ($c) => $c->where('centre_id', $memo->centre_id)));

                    // ...plus teachers of that class at that centre. A teacher
                    // with no class assigned is unrestricted, so include them.
                    $q->orWhere(fn ($w) => $w
                        ->where('role', UserRole::Teacher)
                        ->where(fn ($c) => $c->where('class', $memo->class)->orWhereNull('class')));
                })
                ->when($memo->centre_id, fn ($q) => $q->where(fn ($w) => $w
                    ->where('role', UserRole::Parent)
                    ->orWhereHas('centres', fn ($c) => $c->where('centres.id', $memo->centre_id))
                    ->orWhereDoesntHave('centres')))
                ->get(),
            default => (clone $active)->whereIn('role', [UserRole::Parent, UserRole::Teacher])->get(),
        };
    }

    /**
     * @param  array<int, UploadedFile|null>  $files
     */
    private function storeAttachments(Memo $memo, array $files, User $uploader): void
    {
        foreach (array_filter($files) as $file) {
            $stored = $this->images->store($file, 'memos');

            $memo->attachments()->create([
                'disk' => $stored->disk,
                'path' => $stored->path,
                'thumb_path' => $stored->thumbPath,
                'original_name' => $file->getClientOriginalName(),
                'mime' => $stored->mime,
                'size' => $stored->size,
                'width' => $stored->width,
                'height' => $stored->height,
                'uploaded_by' => $uploader->id,
            ]);
        }
    }

    /**
     * Delete the given attachments (only ones that belong to this memo).
     *
     * @param  array<int, int|string>  $ids
     */
    private function removeAttachments(Memo $memo, array $ids): void
    {
        if ($ids === []) {
            return;
        }

        $memo->attachments()->whereIn('id', $ids)->get()->each->delete();
    }
}
