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

    /** Shaped for a history row. */
    public function historyRow(): array
    {
        return [
            'id' => $this->id,
            'date' => $this->date?->format('Y-m-d'),
            'day' => $this->date?->format('D'),
            'status' => $this->status(),
            'arrived_at' => $this->arrived_at?->format('H:i'),
            'departed_at' => $this->departed_at?->format('H:i'),
        ];
    }

    public static function emptySummary(): array
    {
        return ['status' => 'none', 'arrived_at' => null, 'departed_at' => null];
    }

    /**
     * Mark the child as arrived. Returns false when the day is already closed
     * (departed) and the caller may not override — it resets the next day.
     */
    public function markArrival(int $userId, bool $force = false): bool
    {
        if ($this->departed_at) {
            if (! $force) {
                return false;
            }

            // Staff override: reopen the day.
            $this->departed_at = null;
            $this->departed_by = null;
        }

        if (! $this->arrived_at) {
            $this->arrived_at = now();
            $this->arrived_by = $userId;
        }

        return true;
    }

    /** Mark the child as departed (auto-fills arrival if it was never set). */
    public function markDeparture(int $userId): bool
    {
        if ($this->departed_at) {
            return false;
        }

        $this->departed_at = now();
        $this->departed_by = $userId;

        if (! $this->arrived_at) {
            $this->arrived_at = now();
            $this->arrived_by = $userId;
        }

        return true;
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

    /** Recent attendance history for one student, newest first. */
    public static function historyFor(int $studentId, int $limit = 21): Collection
    {
        return static::query()
            ->where('student_id', $studentId)
            ->orderByDesc('date')
            ->limit($limit)
            ->get();
    }

    /** Attendance rows for a set of students on a given date, keyed by student id. */
    public static function onDateFor(Collection|array $studentIds, string $date): Collection
    {
        return static::query()
            ->whereIn('student_id', $studentIds)
            ->whereDate('date', $date)
            ->get()
            ->keyBy('student_id');
    }
}
