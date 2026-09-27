<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

abstract class BaseNotification extends Notification
{
    public function via(object $notifiable): array
    {
        return ['database', 'broadcast', 'mail'];
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

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject($this->title())
            ->greeting('PPAK UTHM Connect')
            ->line($this->body());

        if ($url = $this->url()) {
            $mail->action('Open PPAK UTHM Connect', url($url));
        }

        return $mail->line('Terima kasih / Thank you.');
    }
}
