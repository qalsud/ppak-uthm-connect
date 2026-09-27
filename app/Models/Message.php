<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Message extends Model
{
    use SoftDeletes;

    public const TYPE_USER = 'user';

    public const TYPE_SYSTEM = 'system';

    protected $fillable = [
        'conversation_id',
        'sender_id',
        'body',
        'type',
        'attendance_photo_id',
        'progress_photo_id',
        'read_at',
        'edited_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
        'edited_at' => 'datetime',
    ];

    protected $appends = ['photo_url', 'is_deleted', 'is_system', 'attachments', 'sent_time', 'sent_date'];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function attendancePhoto(): BelongsTo
    {
        return $this->belongsTo(AttendancePhoto::class);
    }

    public function progressPhoto(): BelongsTo
    {
        return $this->belongsTo(ProgressPhoto::class);
    }

    public function files(): HasMany
    {
        return $this->hasMany(MessageAttachment::class);
    }

    /** Authorised URL to an attached photo (null once pruned). */
    public function getPhotoUrlAttribute(): ?string
    {
        if ($this->attendance_photo_id) {
            return route('attendance.photos.show', $this->attendance_photo_id);
        }

        return $this->progress_photo_id
            ? route('progress.photos.show', $this->progress_photo_id)
            : null;
    }

    public function getIsDeletedAttribute(): bool
    {
        return $this->trashed();
    }

    public function getIsSystemAttribute(): bool
    {
        return $this->type === self::TYPE_SYSTEM;
    }

    /** @return array<int, array<string, mixed>> */
    public function getAttachmentsAttribute(): array
    {
        return $this->files
            ->map(fn (MessageAttachment $file) => $file->payload())
            ->all();
    }

    /** Time formatted in the app timezone (avoids browser drift). */
    public function getSentTimeAttribute(): ?string
    {
        return $this->created_at?->timezone(config('app.timezone'))->format('H:i');
    }

    public function getSentDateAttribute(): ?string
    {
        return $this->created_at?->timezone(config('app.timezone'))->format('Y-m-d');
    }
}
