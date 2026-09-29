<?php

namespace App\Models;

use App\Models\Concerns\HasStoredImage;
use App\Services\Images\ImageStore;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * An optional proof document (medical certificate scan / photo / PDF) attached
 * to an absence request by the parent.
 */
class AbsenceAttachment extends Model
{
    use HasStoredImage;

    protected $fillable = [
        'absence_request_id',
        'student_id',
        'disk',
        'path',
        'thumb_path',
        'original_name',
        'mime',
        'size',
        'uploaded_by',
    ];

    protected $casts = [
        'size' => 'integer',
    ];

    protected function imageRouteName(): string
    {
        return 'absence.documents.show';
    }

    protected function imageRouteParameter(): string
    {
        return 'attachment';
    }

    public function absence(): BelongsTo
    {
        return $this->belongsTo(AbsenceRequest::class, 'absence_request_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function isPdf(): bool
    {
        return $this->mime === 'application/pdf';
    }

    /** Thumbnails only exist for image attachments. */
    public function thumbUrl(): string
    {
        return $this->thumb_path
            ? route($this->imageRouteName(), ['attachment' => $this, 'variant' => 'thumb'])
            : $this->url();
    }

    /**
     * Shape used by the frontend. `url()` points at the authorised route, and
     * `is_pdf` lets the UI show a document chip instead of an image preview.
     */
    public function payload(): array
    {
        return [
            'id' => $this->id,
            'url' => $this->url(),
            'thumb' => $this->thumbUrl(),
            'name' => $this->original_name,
            'mime' => $this->mime,
            'is_pdf' => $this->isPdf(),
            'uploaded_by' => $this->uploadedBy?->name,
            'created_at' => $this->created_at?->format('Y-m-d H:i'),
        ];
    }

    protected static function bootHasStoredImage(): void
    {
        static::deleting(function (self $attachment): void {
            app(ImageStore::class)
                ->delete($attachment->disk, $attachment->path, $attachment->thumb_path);
        });
    }
}
