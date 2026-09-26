<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyActivity extends Model
{
    protected $fillable = [
        'student_id',
        'teacher_id',
        'date',
        'afternoon_sleep',
        'medication',
        'shower',
        'brush_teeth',
        'drink_milk',
        'breakfast',
        'lunch',
        'afternoon_snack',
        'eat_fruits',
        'tantrum_crying',
        'health_issues',
        'injuries',
        'treatment_notes',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
    ];

    public const FIELDS = [
        'afternoon_sleep' => 'Afternoon Sleep/Nap',
        'medication' => 'Medication Given',
        'shower' => 'Take Shower',
        'brush_teeth' => 'Brush Teeth',
        'drink_milk' => 'Drink Milk',
        'breakfast' => 'Breakfast',
        'lunch' => 'Lunch',
        'afternoon_snack' => 'Afternoon Snack',
        'eat_fruits' => 'Eat Fruits',
        'tantrum_crying' => 'Tantrum/Crying',
        'health_issues' => 'Health Issues',
        'injuries' => 'Injuries',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }
}
