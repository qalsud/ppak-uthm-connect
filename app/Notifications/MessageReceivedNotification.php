<?php

namespace App\Notifications;

use App\Models\Conversation;
use App\Models\User;

class MessageReceivedNotification extends BaseNotification
{
    public function __construct(
        private Conversation $conversation,
        private User $sender,
        private string $body,
    ) {}

    public function title(): string
    {
        return 'Mesej baharu / New message';
    }

    public function body(): string
    {
        return $this->sender->name.': '.mb_substr($this->body, 0, 120);
    }

    public function url(): ?string
    {
        // Link to the *recipient's* inbox: a parent send goes to the teacher,
        // a teacher send goes to the parent.
        return $this->sender->isParent()
            ? route('teacher.messages.index')
            : route('parent.messages.index');
    }
}
