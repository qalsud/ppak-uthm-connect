<?php

namespace App\Notifications;

use App\Models\AbsenceRequest;

class AbsenceReviewedNotification extends BaseNotification
{
    public function __construct(private AbsenceRequest $absence) {}

    public function title(): string
    {
        return $this->absence->isApproved()
            ? 'Ketidakhadiran diluluskan / Absence approved'
            : 'Ketidakhadiran ditolak / Absence declined';
    }

    public function body(): string
    {
        $key = $this->absence->isApproved()
            ? 'approval.absence_approved_message'
            : 'approval.absence_declined_message';

        return __($key, [
            'name' => $this->absence->student?->name ?? '',
            'from' => $this->absence->start_date?->format('d/m/Y'),
            'to' => $this->absence->end_date?->format('d/m/Y'),
        ]);
    }

    public function url(): ?string
    {
        return route('parent.attendance.index');
    }
}
