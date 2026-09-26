<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    protected $fillable = [
        'conversation_id',
        'sender_id',
        'body',
        'attendance_photo_id',
        'read_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
    ];

    protected $appends = ['photo_url'];

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

    /** Authorised URL to an attached checkout photo (null once pruned). */
    public function getPhotoUrlAttribute(): ?string
    {
        return $this->attendance_photo_id
            ? route('attendance.photos.show', $this->attendance_photo_id)
            : null;
    }
}
