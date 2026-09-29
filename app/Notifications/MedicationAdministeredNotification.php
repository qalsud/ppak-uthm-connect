<?php

namespace App\Notifications;

use App\Models\MedicationRequest;

class MedicationAdministeredNotification extends BaseNotification
{
    public function __construct(private MedicationRequest $medication) {}

    public function title(): string
    {
        return 'Ubat diberikan / Medication given';
    }

    public function body(): string
    {
        return __('approval.medication_given_message', [
            'name' => $this->medication->student?->name ?? '',
            'medicine' => $this->medication->medicine,
            'time' => $this->medication->given_at?->format('H:i') ?? now()->format('H:i'),
        ]);
    }

    public function url(): ?string
    {
        $student = $this->medication->student;

        return $student ? route('parent.children.show', $student) : null;
    }
}
