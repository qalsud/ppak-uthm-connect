<?php

namespace App\Notifications;

use App\Models\ProgressGroupActivity;
use App\Models\Student;

/** A child took part in a shared group activity with the class. */
class GroupActivityRecordedNotification extends BaseNotification
{
    public function __construct(
        private Student $student,
        private ProgressGroupActivity $group,
    ) {}

    public function category(): string
    {
        return self::CATEGORY_PROGRESS;
    }

    public function studentId(): ?int
    {
        return $this->student->id;
    }

    public function title(): string
    {
        return 'Aktiviti kumpulan / Group activity';
    }

    public function body(): string
    {
        return __('approval.group_activity_message', [
            'name' => $this->student->name,
            'theme' => $this->group->sub_theme ?: __('progress'),
        ]);
    }

    public function url(): ?string
    {
        return route('parent.children.show', $this->student).'#progress';
    }
}
