<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class FinancialRecord extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'student_id',
        'month',
        'due_on',
        'amount',
        'overtime_hours',
        'status',
        'paid_on',
        'stripe_session_id',
        'ReceiptGenerated',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'overtime_hours' => 'decimal:2',
        'due_on' => 'date:Y-m-d',
        'paid_on' => 'date:Y-m-d',
        'ReceiptGenerated' => 'boolean',
    ];

    public function isOverdue(): bool
    {
        return $this->status === 'unpaid'
            && $this->due_on !== null
            && $this->due_on->isPast();
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_id');
    }

    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }
}
