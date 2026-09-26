<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinancialRecord extends Model
{
    protected $fillable = [
        'student_id',
        'month',
        'amount',
        'overtime_hours',
        'status',
        'paid_on',
        'stripe_session_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'overtime_hours' => 'decimal:2',
        'paid_on' => 'date:Y-m-d',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_id');
    }

    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }
}
