<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Holds the active pricing configuration (replaces hard-coded RM310 / RM6).
 */
class FeeSetting extends Model
{
    protected $fillable = [
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

    public static function current(): self
    {
        return static::query()->active()->latest('id')->first()
            ?? new static(['monthly_fee' => 310.00, 'overtime_rate' => 6.00]);
    }
}
