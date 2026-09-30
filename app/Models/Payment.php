<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $fillable = [
        'user_id',
        'student_id',
        'amount',
        'financial_record_ids',
        'stripe_session_id',
        'refund_id',
        'refunded_amount',
        'refund_reason',
        'status',
        'paid_at',
        'refunded_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'refunded_amount' => 'decimal:2',
        'financial_record_ids' => 'array',
        'paid_at' => 'datetime',
        'refunded_at' => 'datetime',
    ];

    public function isRefunded(): bool
    {
        return $this->status === 'refunded';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
