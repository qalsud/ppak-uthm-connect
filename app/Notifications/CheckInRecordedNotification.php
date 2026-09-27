<?php

namespace App\Notifications;

use App\Models\Attendance;
use App\Models\Student;

class CheckInRecordedNotification extends BaseNotification
{
    public function __construct(
        private Student $student,
        private Attendance $attendance,
    ) {}

    public function title(): string
    {
        return 'Tiba sekolah / Checked in';
    }

    public function body(): string
    {
        return __('approval.checkin_body', [
            'name' => $this->student->name,
            'time' => $this->attendance->arrived_at?->format('H:i') ?? '',
        ]);
    }

    public function url(): ?string
    {
        return route('parent.attendance.index');
    }
}
