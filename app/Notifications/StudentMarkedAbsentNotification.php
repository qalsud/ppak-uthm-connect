<?php

namespace App\Notifications;

use App\Models\Attendance;
use App\Models\Student;

/** A teacher marked a child absent on the register. */
class StudentMarkedAbsentNotification extends BaseNotification
{
    public function __construct(
        private Student $student,
        private Attendance $attendance,
        private string $type,
    ) {}

    public function category(): string
    {
        return self::CATEGORY_ATTENDANCE;
    }

    public function studentId(): ?int
    {
        return $this->student->id;
    }

    public function title(): string
    {
        return 'Ditanda tidak hadir / Marked absent';
    }

    public function body(): string
    {
        return __('approval.student_absent_message', [
            'name' => $this->student->name,
            'date' => $this->attendance->date?->format('d/m/Y'),
            'type' => __('absence.'.$this->type),
        ]);
    }

    public function url(): ?string
    {
        return route('parent.attendance.index');
    }
}
