<?php

namespace App\Notifications;

use App\Models\AbsenceRequest;

class AbsenceRequestedNotification extends BaseNotification
{
    public function __construct(private AbsenceRequest $absence) {}

    public function category(): string
    {
        return self::CATEGORY_ABSENCE;
    }

    public function priority(): string
    {
        return self::PRIORITY_HIGH;
    }

    public function studentId(): ?int
    {
        return $this->absence->student_id;
    }

    public function title(): string
    {
        return 'Permohonan ketidakhadiran / Absence request';
    }

    public function body(): string
    {
        return __('approval.absence_requested_message', [
            'name' => $this->absence->student?->name ?? '',
            'from' => $this->absence->start_date?->format('d/m/Y'),
            'to' => $this->absence->end_date?->format('d/m/Y'),
            'type' => __('absence.'.$this->absence->type),
        ]);
    }

    public function url(): ?string
    {
        return route('teacher.attendance.index');
    }
}
