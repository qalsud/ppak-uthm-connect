<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Holds the active pricing configuration (replaces hard-coded RM310 / RM6).
 *
 * A row with `centre_id = null` is the shared/global rate; a row with a
 * centre overrides it for that centre only.
 */
class FeeSetting extends Model
{
    protected $fillable = [
        'centre_id',
        'monthly_fee',
        'overtime_rate',
        'is_active',
    ];

    protected $casts = [
        'monthly_fee' => 'decimal:2',
        'overtime_rate' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function centre(): BelongsTo
    {
        return $this->belongsTo(Centre::class);
    }

    /**
     * The active rate for a centre, falling back to the global rate, then the
     * shipped default. An unsaved model is returned when nothing is configured.
     */
    public static function current(?int $centreId = null): self
    {
        if ($centreId) {
            $scoped = static::query()->active()->where('centre_id', $centreId)->latest('id')->first();

            if ($scoped) {
                return $scoped;
            }
        }

        return static::query()->active()->whereNull('centre_id')->latest('id')->first()
            ?? new static(['monthly_fee' => 310.00, 'overtime_rate' => 6.00]);
    }
}
