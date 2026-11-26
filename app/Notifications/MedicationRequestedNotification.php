<?php

namespace App\Notifications;

use App\Models\MedicationRequest;

/** A parent has asked staff to give their child medicine today. */
class MedicationRequestedNotification extends BaseNotification
{
    public function __construct(private MedicationRequest $medication) {}

    public function category(): string
    {
        return self::CATEGORY_MEDICATION;
    }

    public function priority(): string
    {
        return self::PRIORITY_HIGH;
    }

    public function studentId(): ?int
    {
        return $this->medication->student_id;
    }

    public function title(): string
    {
        return 'Permohonan ubat / Medication request';
    }

    public function body(): string
    {
        return __('approval.medication_requested_message', [
            'name' => data_get($this->medication->student, 'name', ''),
            'medicine' => $this->medication->medicine,
            'time' => $this->medication->time_due ?: __('approval.any_time'),
        ]);
    }

    public function url(): ?string
    {
        return route('teacher.attendance.index');
    }
}
