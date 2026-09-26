<?php

namespace App\Notifications;

use App\Models\Memo;

class MemoPostedNotification extends BaseNotification
{
    public function __construct(private Memo $memo) {}

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
}
