<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

abstract class BaseNotification extends Notification
{
    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    abstract public function title(): string;

    abstract public function body(): string;

    abstract public function url(): ?string;

    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->title(),
            'body' => $this->body(),
            'url' => $this->url(),
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'title' => $this->title(),
            'body' => $this->body(),
            'url' => $this->url(),
        ]);
    }
}
