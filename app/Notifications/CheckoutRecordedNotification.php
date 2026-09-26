<?php

namespace App\Notifications;

use App\Models\Attendance;
use App\Models\Student;

class CheckoutRecordedNotification extends BaseNotification
{
    public function __construct(
        private Student $student,
        private Attendance $attendance,
        private bool $hasPhoto,
    ) {}

    public function title(): string
    {
        return 'Pulang sekolah / Checked out';
    }

    public function body(): string
    {
        return __('approval.checkout_body', [
            'name' => $this->student->name,
            'time' => $this->attendance->departed_at?->format('H:i') ?? '',
        ]);
    }

    public function url(): ?string
    {
        return route('parent.messages.index');
    }
}
