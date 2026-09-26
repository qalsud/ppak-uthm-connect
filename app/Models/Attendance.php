<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
        'checkout_note',
        'checkout_photo_override',
        'checkout_override_reason',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'arrived_at' => 'datetime',
        'departed_at' => 'datetime',
        'checkout_photo_override' => 'boolean',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function photos(): HasMany
    {
        return $this->hasMany(AttendancePhoto::class);
    }

    /** Latest checkout photo, if any. */
    public function checkoutPhoto(): ?AttendancePhoto
    {
        return $this->photos
            ->where('type', 'checkout')
            ->sortByDesc('id')
            ->first();
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
            ...$this->checkoutPayload(),
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
            ...$this->checkoutPayload(),
        ];
    }

    /** @return array{photo: array|null, note: string|null, photo_override: bool} */
    private function checkoutPayload(): array
    {
        return [
            'photo' => $this->checkoutPhoto()?->payload(),
            'note' => $this->checkout_note,
            'photo_override' => (bool) $this->checkout_photo_override,
        ];
    }

    public static function emptySummary(): array
    {
        return [
            'status' => 'none',
            'arrived_at' => null,
            'departed_at' => null,
            'photo' => null,
            'note' => null,
            'photo_override' => false,
        ];
    }

    /**
     * Mark the child as arrived. Re-opens the day if they had already been
     * marked as gone home (no same-day lock).
     */
    public function markArrival(int $userId): void
    {
        $this->arrived_at = now();
        $this->arrived_by = $userId;
        $this->departed_at = null;
        $this->departed_by = null;
    }

    /** Mark the child as departed (auto-fills arrival if it was never set). */
    public function markDeparture(int $userId): void
    {
        if ($this->departed_at) {
            return;
        }

        $this->departed_at = now();
        $this->departed_by = $userId;

        if (! $this->arrived_at) {
            $this->arrived_at = now();
            $this->arrived_by = $userId;
        }
    }

    /** Today's attendance keyed by student id. */
    public static function todayFor(Collection|array $studentIds): Collection
    {
        return static::query()
            ->with('photos.uploadedBy:id,name')
            ->whereIn('student_id', $studentIds)
            ->whereDate('date', today())
            ->get()
            ->keyBy('student_id');
    }

    /** Recent attendance history for one student, newest first. */
    public static function historyFor(int $studentId, int $limit = 21): Collection
    {
        return static::query()
            ->with('photos.uploadedBy:id,name')
            ->where('student_id', $studentId)
            ->orderByDesc('date')
            ->limit($limit)
            ->get();
    }

    /** Attendance rows for a set of students on a given date, keyed by student id. */
    public static function onDateFor(Collection|array $studentIds, string $date): Collection
    {
        return static::query()
            ->with('photos.uploadedBy:id,name')
            ->whereIn('student_id', $studentIds)
            ->whereDate('date', $date)
            ->get()
            ->keyBy('student_id');
    }
}
