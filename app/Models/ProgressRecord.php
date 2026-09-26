<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProgressRecord extends Model
{
    protected $fillable = [
        'student_id',
        'teacher_id',
        'date',
        'sub_theme',
        'activity_done',
        'child_proficiency',
        'permata_activity',
        'free_activity',
        'development_proficiency',
        'notes',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public const PERMATA = ['Drawing', 'Coloring', 'Crafting', 'Reading', 'Writing'];

    public const FREE = ['Learning', 'Playing', 'Reading', 'Drawing', 'Other'];

    public const DEVELOPMENT = [
        'Creativity Innovation',
        'Social Skills',
        'Motor Skills',
        'Language Skills',
        'Cognitive Skills',
    ];

    public const GRADES = ['Good', 'Average', 'Poor'];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }
}
