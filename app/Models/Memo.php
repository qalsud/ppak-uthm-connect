<?php

namespace App\Models;

use App\Support\ActiveCentre;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Memo extends Model
{
    use SoftDeletes;

    /** all | parents | teachers | class */
    public const AUDIENCES = ['all', 'parents', 'teachers', 'class'];

    /** Most photos a single memo may carry. */
    public const MAX_PHOTOS = 3;

    protected $fillable = [
        'author_id',
        'title',
        'description',
        'audience',
        'class',
        'centre_id',
    ];

    /** Expose the photos (authorised URLs) to the frontend. */
    protected $appends = ['photos'];

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function centre(): BelongsTo
    {
        return $this->belongsTo(Centre::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(MemoAttachment::class);
    }

    /** @return array<int, array<string, mixed>> */
    public function getPhotosAttribute(): array
    {
        return $this->attachments
            ->map(fn (MemoAttachment $photo) => $photo->payload())
            ->all();
    }

    /**
     * Memos a given user may see. The ONE place this is decided, so the badge
     * count and the list can never disagree.
     */
    public function scopeVisibleTo($query, ?User $user)
    {
        if (! $user) {
            return $query->whereRaw('1 = 0');
        }

        if ($user->isAdmin()) {
            return $query;
        }

        if ($user->isTeacher()) {
            $centres = $user->centreIds();

            return $query
                ->whereIn('audience', ['all', 'teachers', 'class'])
                ->when($centres !== null, fn ($q) => $q->where(fn ($w) => $w
                    ->whereIn('centre_id', $centres)
                    ->orWhereNull('centre_id')))
                ->where(function ($q) use ($user) {
                    $q->whereIn('audience', ['all', 'teachers']);

                    if ($user->class) {
                        $q->orWhere(fn ($w) => $w->where('audience', 'class')->where('class', $user->class));
                    }
                });
        }

        // Parent: their children's classes, within their centres.
        $classes = $user->students()->pluck('class')->unique()->filter()->all();
        $centres = $user->students()->pluck('centre_id')->unique()->filter()->all();

        return $query
            ->where(fn ($q) => $q
                ->whereIn('audience', ['all', 'parents'])
                ->orWhere(fn ($w) => $w->where('audience', 'class')->whereIn('class', $classes)))
            ->when($centres, fn ($q) => $q->where(fn ($w) => $w
                ->whereIn('centre_id', $centres)
                ->orWhereNull('centre_id')));
    }

    /** Limit to the admin's currently-selected centre (null = all centres). */
    public function scopeForActiveCentre($query)
    {
        $centreId = ActiveCentre::id();

        return $centreId ? $query->where('centre_id', $centreId) : $query;
    }

    public function audienceLabel(): string
    {
        return match ($this->audience) {
            'parents' => 'Parents',
            'teachers' => 'Teachers',
            'class' => Student::classLabelStatic((string) $this->class),
            default => 'Everyone',
        };
    }
}
