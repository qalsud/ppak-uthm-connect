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

    /** Most photos a single memo may carry. */
    public const MAX_PHOTOS = 3;

    protected $fillable = [
        'author_id',
        'title',
        'description',
        'audience',
        'class',
        'centre_id',
        'is_public',
        'publish_at',
        'expires_at',
        'is_pinned',
        'notify_users',
    ];

    protected $casts = [
        'is_public' => 'boolean',
        'publish_at' => 'datetime',
        'expires_at' => 'datetime',
        'is_pinned' => 'boolean',
        'notify_users' => 'boolean',
    ];

    /** Default flags for new memos (the DB defaults are not hydrated on create). */
    protected $attributes = [
        'notify_users' => true,
    ];

    /** Expose the photos (authorised URLs) to the frontend. */
    protected $appends = ['photos'];

    protected static function booted(): void
    {
        // Soft deletes keep attachments so the memo can be restored from Trash.
        // A force delete is permanent, so remove the files (and their thumbnails).
        static::forceDeleting(function (self $memo): void {
            $memo->attachments()->get()->each->delete();
        });
    }

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

    /** Public landing notices that are live right now. */
    public function scopePublicLanding($query)
    {
        return $query
            ->where('is_public', true)
            ->where(fn ($q) => $q->whereNull('publish_at')->orWhere('publish_at', '<=', now()))
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->orderByDesc('is_pinned')
            // NULL publish_at means "live now"; fall back to the creation time
            // so ordering is identical on SQLite and PostgreSQL.
            ->orderByRaw('COALESCE(publish_at, created_at) DESC');
    }
}
