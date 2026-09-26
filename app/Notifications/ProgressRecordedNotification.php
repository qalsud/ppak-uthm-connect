<?php

namespace App\Notifications;

use App\Models\Student;

class ProgressRecordedNotification extends BaseNotification
{
    public function __construct(private Student $student) {}

    public function title(): string
    {
        return 'Perkembangan murid / Progress';
    }

    public function body(): string
    {
        return $this->student->name.' — '.__('approval.progress_saved');
    }

    public function url(): ?string
    {
        return route('parent.activities.index');
    }
}
