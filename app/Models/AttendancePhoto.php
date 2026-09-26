<?php

namespace App\Models;

use App\Services\Images\ImageStore;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendancePhoto extends Model
{
    protected $fillable = [
        'attendance_id',
        'student_id',
        'type',
        'disk',
        'path',
        'thumb_path',
        'original_name',
        'mime',
        'size',
        'width',
        'height',
        'note',
        'uploaded_by',
    ];

    protected $casts = [
        'size' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
    ];

    public function attendance(): BelongsTo
    {
        return $this->belongsTo(Attendance::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /** Authorised URL to the full-size image. */
    public function url(): string
    {
        return route('attendance.photos.show', $this);
    }

    /** Authorised URL to the thumbnail (falls back to the full image). */
    public function thumbUrl(): string
    {
        return $this->thumb_path
            ? route('attendance.photos.show', ['attendancePhoto' => $this, 'variant' => 'thumb'])
            : $this->url();
    }

    /** Shape used by the frontend. */
    public function payload(): array
    {
        return [
            'id' => $this->id,
            'url' => $this->url(),
            'thumb' => $this->thumbUrl(),
            'note' => $this->note,
            'uploaded_by' => $this->uploadedBy?->name,
            'created_at' => $this->created_at?->format('Y-m-d H:i'),
        ];
    }

    protected static function booted(): void
    {
        static::deleting(function (self $photo): void {
            app(ImageStore::class)->delete($photo->disk, $photo->path, $photo->thumb_path);
        });
    }
}
