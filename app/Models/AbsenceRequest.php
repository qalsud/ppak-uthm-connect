<?php

namespace App\Models;

use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Collection;

class AbsenceRequest extends Model
{
    use SoftDeletes;

    /** sick | personal | other */
    public const TYPES = ['sick', 'personal', 'other'];

    /** pending | approved | declined */
    public const STATUSES = ['pending', 'approved', 'declined'];

    /** Shipped default for the longest single request, in days (inclusive). */
    public const MAX_DAYS = 31;

    /** The live limit from settings (falls back to MAX_DAYS). */
    public static function maxDays(): int
    {
        return (int) setting('operations.absence_max_days', self::MAX_DAYS);
    }

    protected $fillable = [
        'student_id',
        'requested_by',
        'start_date',
        'end_date',
        'type',
        'reason',
        'status',
        'reviewed_by',
        'reviewed_at',
        'review_note',
    ];

    protected $casts = [
        'start_date' => 'date:Y-m-d',
        'end_date' => 'date:Y-m-d',
        'reviewed_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(AbsenceAttachment::class, 'absence_request_id');
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    /** Every calendar day covered by the request (oldest first). */
    public function dates(): Collection
    {
        if (! $this->start_date || ! $this->end_date) {
            return collect();
        }

        $period = CarbonPeriod::create($this->start_date, $this->end_date);

        return collect($period)->take(self::maxDays() + 1)->values();
    }

    /** Optional proof documents (medical certificate scans, photos). */
    public function attachmentPayloads(): array
    {
        return $this->attachments
            ->map(fn (AbsenceAttachment $a) => $a->payload())
            ->values()
            ->all();
    }

    /**
     * Materialise (or clear) the attendance rows for this request's dates.
     *
     * An approved request marks the child absent on each covered day — unless
     * they actually turned up, in which case the arrival wins. Declining (or
     * reverting) removes the flag and drops any now-empty rows.
     */
    public function syncAttendance(): void
    {
        foreach ($this->dates() as $date) {
            $attendance = Attendance::firstOrNew([
                'student_id' => $this->student_id,
                'date' => $date->toDateString(),
            ]);

            if ($this->isApproved() && ! $attendance->arrived_at) {
                $attendance->absence_request_id = $this->id;
                $attendance->absence_type = $this->type;
                $attendance->save();

                continue;
            }

            if ($attendance->absence_request_id !== $this->id) {
                continue;
            }

            $attendance->absence_request_id = null;
            $attendance->absence_type = null;

            if ($attendance->arrived_at || $attendance->departed_at) {
                $attendance->save();
            } else {
                $attendance->delete();
            }
        }
    }

    /** Shaped for the frontend. */
    public function summary(): array
    {
        return [
            'id' => $this->id,
            'student' => $this->student?->name,
            'start_date' => $this->start_date?->format('Y-m-d'),
            'end_date' => $this->end_date?->format('Y-m-d'),
            'days' => $this->dates()->count(),
            'type' => $this->type,
            'reason' => $this->reason,
            'status' => $this->status,
            'review_note' => $this->review_note,
            'reviewed_by' => $this->reviewedBy?->name,
            'requested_by' => $this->requestedBy?->name,
            'attachments' => $this->attachmentPayloads(),
        ];
    }
}
