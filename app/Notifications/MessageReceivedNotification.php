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
        return $this->conversation->student->parent_id === $this->sender->id
            ? route('parent.messages.index')
            : route('teacher.messages.index');
    }
}
