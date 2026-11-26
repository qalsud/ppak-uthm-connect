<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * One shared activity recorded for several children at once. The ratings stay
 * on each child's progress row so a parent only ever sees their own child.
 */
class ProgressGroupActivity extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'teacher_id',
        'centre_id',
        'class',
        'date',
        'sub_theme',
        'activity_done',
        'child_proficiency',
        'permata_activity',
        'free_activity',
        'development_proficiency',
        'notes',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
    ];

    protected $appends = ['photo', 'participant_count'];

    protected static function booted(): void
    {
        // A soft delete keeps the child progress rows (and the shared photo)
        // intact; only a permanent delete removes the stored file.
        static::forceDeleting(function (self $group): void {
            $group->photos()->get()->each->delete();
        });
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function centre(): BelongsTo
    {
        return $this->belongsTo(Centre::class);
    }

    public function records(): HasMany
    {
        return $this->hasMany(ProgressRecord::class, 'group_activity_id');
    }

    /** @return HasMany<ProgressGroupPhoto, $this> */
    public function photos(): HasMany
    {
        return $this->hasMany(ProgressGroupPhoto::class, 'group_activity_id');
    }

    public function latestPhoto(): ?ProgressGroupPhoto
    {
        /** @var ProgressGroupPhoto|null $photo */
        $photo = $this->photos->sortByDesc('id')->first();

        return $photo;
    }

    /** Shared group photo, shaped for the frontend. */
    public function getPhotoAttribute(): ?array
    {
        return $this->latestPhoto()?->payload();
    }

    public function getParticipantCountAttribute(): int
    {
        return (int) ($this->records_count ?? $this->records()->count());
    }
}
