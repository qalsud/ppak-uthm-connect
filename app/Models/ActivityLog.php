<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Facades\Auth;

class ActivityLog extends Model
{
    protected $fillable = [
        'user_id',
        'action',
        'subject_type',
        'subject_id',
        'description',
        'properties',
        'ip',
    ];

    protected $casts = [
        'properties' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    /** Record an auditable action performed by the current user. */
    public static function record(
        string $action,
        ?Model $subject = null,
        ?string $description = null,
        array $properties = [],
    ): self {
        return static::create([
            'user_id' => Auth::id(),
            'action' => $action,
            'subject_type' => $subject ? $subject::class : null,
            'subject_id' => $subject?->getKey(),
            'description' => $description,
            'properties' => $properties ?: null,
            'ip' => request()->ip(),
        ]);
    }

    /** Human label, e.g. `student.created` → `Student created`. */
    public function label(): string
    {
        return ucfirst(str_replace('.', ' ', $this->action));
    }
}
