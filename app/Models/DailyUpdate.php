<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyUpdate extends Model
{
    protected $fillable = [
        'student_id',
        'date',
        'arrival_time',
        'sleep_status',
        'bath_status',
        'health_status',
        'parent_notes',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
    ];

    /** MySQL TIME comes back as HH:MM:SS — expose it as HH:MM. */
    protected function arrivalTime(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value ? substr($value, 0, 5) : null,
        );
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
