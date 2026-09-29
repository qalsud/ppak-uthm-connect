<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuthorisedCollector extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'student_id',
        'name',
        'relationship',
        'phone',
        'ic_number',
        'photo_disk',
        'photo_path',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function hasPhoto(): bool
    {
        return (bool) $this->photo_path;
    }

    public function photoUrl(): ?string
    {
        return $this->photo_path
            ? route('collector.photos.show', $this->id)
            : null;
    }

    /** Stream the collector's photo from the private disk. */
    public function photoResponse(): ?StreamedResponse
    {
        if (! $this->photo_path) {
            return null;
        }

        $disk = Storage::disk($this->photo_disk ?? config('media.disk'));

        if (! $disk->exists($this->photo_path)) {
            return null;
        }

        return $disk->response($this->photo_path, null, [
            'Content-Type' => 'image/jpeg',
            'Cache-Control' => 'private, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function summary(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'relationship' => $this->relationship,
            'phone' => $this->phone,
            'ic_number' => $this->ic_number,
            'photo_url' => $this->photoUrl(),
            'is_active' => (bool) $this->is_active,
            'notes' => $this->notes,
        ];
    }
}
