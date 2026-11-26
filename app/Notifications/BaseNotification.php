<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

abstract class BaseNotification extends Notification
{
    public const CATEGORY_ATTENDANCE = 'attendance';

    public const CATEGORY_ABSENCE = 'absence';

    public const CATEGORY_MEDICATION = 'medication';

    public const CATEGORY_PROGRESS = 'progress';

    public const CATEGORY_ACTIVITIES = 'activities';

    public const CATEGORY_FEES = 'fees';

    public const CATEGORY_PAYMENTS = 'payments';

    public const CATEGORY_MESSAGES = 'messages';

    public const CATEGORY_MEMOS = 'memos';

    public const CATEGORY_ACCOUNT = 'account';

    public const CATEGORY_REGISTRATION = 'registration';

    public const CATEGORY_SYSTEM = 'system';

    /** Categories shown in the notification centre, in display order. */
    public const CATEGORIES = [
        self::CATEGORY_ATTENDANCE,
        self::CATEGORY_ABSENCE,
        self::CATEGORY_MEDICATION,
        self::CATEGORY_PROGRESS,
        self::CATEGORY_ACTIVITIES,
        self::CATEGORY_FEES,
        self::CATEGORY_PAYMENTS,
        self::CATEGORY_MESSAGES,
        self::CATEGORY_MEMOS,
        self::CATEGORY_ACCOUNT,
        self::CATEGORY_REGISTRATION,
        self::CATEGORY_SYSTEM,
    ];

    public const PRIORITY_HIGH = 'high';

    public const PRIORITY_NORMAL = 'normal';

    public const PRIORITY_LOW = 'low';

    /** Categories that email by default unless the user opts out. */
    public const EMAIL_DEFAULT_CATEGORIES = [
        self::CATEGORY_ABSENCE,
        self::CATEGORY_ACCOUNT,
        self::CATEGORY_FEES,
        self::CATEGORY_PAYMENTS,
    ];

    /**
     * In-app delivery is always on. Email is opt-in per category: a user's
     * explicit preference wins, otherwise the category default applies.
     */
    public function via(object $notifiable): array
    {
        $channels = ['database', 'broadcast'];

        if ($this->wantsEmail($notifiable)) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    abstract public function title(): string;

    abstract public function body(): string;

    abstract public function url(): ?string;

    /** One of the CATEGORY_* constants. */
    public function category(): string
    {
        return self::CATEGORY_SYSTEM;
    }

    /** One of the PRIORITY_* constants; drives the bell's accent colour. */
    public function priority(): string
    {
        return self::PRIORITY_NORMAL;
    }

    /** Link the notification to a child, when there is one. */
    public function studentId(): ?int
    {
        return null;
    }

    /** High-signal categories email by default; everything else is in-app. */
    protected function emailEnabledByDefault(): bool
    {
        return in_array($this->category(), self::EMAIL_DEFAULT_CATEGORIES, true);
    }

    protected function wantsEmail(object $notifiable): bool
    {
        $preferences = $notifiable->notification_preferences ?? null;

        if (is_array($preferences) && array_key_exists($this->category(), $preferences)) {
            return filter_var($preferences[$this->category()], FILTER_VALIDATE_BOOLEAN);
        }

        // Keep the existing chat opt-in working for accounts that have not
        // visited the expanded preferences form yet.
        if ($this->category() === self::CATEGORY_MESSAGES) {
            return (bool) ($notifiable->notify_email_messages ?? false);
        }

        return $this->emailEnabledByDefault();
    }

    /**
     * The in-app link for a specific recipient. Most notifications have one
     * destination; override this when a role has its own screen (e.g. memos).
     */
    protected function urlFor(object $notifiable): ?string
    {
        return $this->url();
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->title(),
            'body' => $this->body(),
            'url' => $this->urlFor($notifiable),
            'category' => $this->category(),
            'priority' => $this->priority(),
            'student_id' => $this->studentId(),
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }

    /** Listen with `useEcho(..., '.notification', ...)`. */
    public function broadcastAs(): string
    {
        return 'notification';
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject($this->title())
            ->greeting('PPAK UTHM Connect')
            ->line($this->body());

        if ($url = $this->urlFor($notifiable)) {
            $mail->action('Open PPAK UTHM Connect', url($url));
        }

        return $mail->line('Terima kasih / Thank you.');
    }
}
