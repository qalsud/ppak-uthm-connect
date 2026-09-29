<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MedicationRequest extends Model
{
    public const STATUSES = ['pending', 'given', 'declined'];

    protected $fillable = [
        'student_id',
        'requested_by',
        'date',
        'medicine',
        'dosage',
        'time_due',
        'notes',
        'status',
        'given_at',
        'given_by',
        'administered_note',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'given_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function givenBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'given_by');
    }

    /** Shaped for the frontend. */
    public function summary(): array
    {
        return [
            'id' => $this->id,
            'date' => $this->date?->format('Y-m-d'),
            'student' => $this->student?->name,
            'medicine' => $this->medicine,
            'dosage' => $this->dosage,
            'time_due' => $this->time_due,
            'notes' => $this->notes,
            'status' => $this->status,
            'given_at' => $this->given_at?->format('H:i'),
            'given_by' => $this->givenBy?->name,
            'administered_note' => $this->administered_note,
        ];
    }
}
