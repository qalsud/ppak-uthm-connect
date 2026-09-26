<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Collection;

class Attendance extends Model
{
    protected $table = 'attendance';

    protected $fillable = [
        'student_id',
        'date',
        'arrived_at',
        'departed_at',
        'arrived_by',
        'departed_by',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'arrived_at' => 'datetime',
        'departed_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /** none | school | home */
    public function status(): string
    {
        if ($this->departed_at) {
            return 'home';
        }

        if ($this->arrived_at) {
            return 'school';
        }

        return 'none';
    }

    /** Shaped for the frontend. */
    public function summary(): array
    {
        return [
            'status' => $this->status(),
            'arrived_at' => $this->arrived_at?->format('H:i'),
            'departed_at' => $this->departed_at?->format('H:i'),
        ];
    }

    public static function emptySummary(): array
    {
        return ['status' => 'none', 'arrived_at' => null, 'departed_at' => null];
    }

    /** Today's attendance keyed by student id. */
    public static function todayFor(Collection|array $studentIds): Collection
    {
        return static::query()
            ->whereIn('student_id', $studentIds)
            ->whereDate('date', today())
            ->get()
            ->keyBy('student_id');
    }
}
