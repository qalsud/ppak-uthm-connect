<?php

namespace App\Notifications;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;

class MessageReceivedNotification extends BaseNotification
{
    public function __construct(
        private Conversation $conversation,
        private User $sender,
        private string $body,
    ) {}

    public function category(): string
    {
        return self::CATEGORY_MESSAGES;
    }

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
        // Deep-link straight to the thread, on the recipient's side.
        return $this->sender->isParent()
            ? route('teacher.messages.show', $this->conversation)
            : route('parent.messages.show', $this->conversation);
    }

    public function toMail(object $notifiable): MailMessage
    {
        return parent::toMail($notifiable);
    }
}
