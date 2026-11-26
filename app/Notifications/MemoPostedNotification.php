<?php

namespace App\Notifications;

use App\Models\Memo;

class MemoPostedNotification extends BaseNotification
{
    public function __construct(private Memo $memo) {}

    public function category(): string
    {
        return self::CATEGORY_MEMOS;
    }

    public function title(): string
    {
        return 'Notis baharu / New memo';
    }

    public function body(): string
    {
        return $this->memo->title;
    }

    public function url(): ?string
    {
        return route('parent.memos.index');
    }

    protected function urlFor(object $notifiable): ?string
    {
        if (method_exists($notifiable, 'isTeacher') && $notifiable->isTeacher()) {
            return route('teacher.memos.index');
        }

        return $this->url();
    }
}
