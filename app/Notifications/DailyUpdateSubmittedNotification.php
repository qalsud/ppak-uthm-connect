<?php

namespace App\Notifications;

use App\Models\DailyUpdate;
use App\Models\Student;

class DailyUpdateSubmittedNotification extends BaseNotification
{
    public function __construct(
        private Student $student,
        private DailyUpdate $update,
    ) {}

    public function title(): string
    {
        return 'Kemas kini harian / Daily update';
    }

    public function body(): string
    {
        return $this->student->name.' — '.$this->update->date->format('d M').' · '
            .$this->update->sleep_status.' / '.$this->update->bath_status;
    }

    public function url(): ?string
    {
        // No `class` param: a class key exists at every centre, so passing a
        // bare class could land the teacher on the wrong centre's register.
        return route('teacher.daily-updates.index');
    }
}
