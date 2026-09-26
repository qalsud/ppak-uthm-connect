<?php

namespace App\Notifications;

use App\Models\Student;

class ActivityRecordedNotification extends BaseNotification
{
    public function __construct(private Student $student) {}

    public function title(): string
    {
        return 'Aktiviti harian / Daily activity';
    }

    public function body(): string
    {
        return $this->student->name.' — '.__('approval.activity_saved');
    }

    public function url(): ?string
    {
        return route('parent.activities.index');
    }
}
