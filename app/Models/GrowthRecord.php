<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GrowthRecord extends Model
{
    protected $fillable = [
        'student_id',
        'date',
        'height_cm',
        'weight_kg',
        'bmi',
        'recorded_by',
        'notes',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'height_cm' => 'decimal:1',
        'weight_kg' => 'decimal:1',
        'bmi' => 'decimal:1',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    /** BMI from height (cm) and weight (kg). Null when either is missing. */
    public static function bmiFor(?float $heightCm, ?float $weightKg): ?float
    {
        if (! $heightCm || ! $weightKg) {
            return null;
        }

        $metres = $heightCm / 100;

        return round($weightKg / ($metres * $metres), 1);
    }

    /** Shaped for the frontend. */
    public function summary(): array
    {
        return [
            'id' => $this->id,
            'date' => $this->date?->format('Y-m-d'),
            'student' => $this->student?->name,
            'height_cm' => $this->height_cm !== null ? (float) $this->height_cm : null,
            'weight_kg' => $this->weight_kg !== null ? (float) $this->weight_kg : null,
            'bmi' => $this->bmi !== null ? (float) $this->bmi : null,
            'notes' => $this->notes,
            'recorded_by' => $this->recordedBy?->name,
        ];
    }
}
