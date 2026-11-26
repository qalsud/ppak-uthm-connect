<?php

namespace App\Notifications;

class FeeReminderNotification extends BaseNotification
{
    public function __construct(
        private float $amount,
        private int $count,
    ) {}

    public function category(): string
    {
        return self::CATEGORY_FEES;
    }

    public function priority(): string
    {
        return self::PRIORITY_HIGH;
    }

    protected function emailEnabledByDefault(): bool
    {
        return true;
    }

    public function title(): string
    {
        return 'Peringatan yuran / Fee reminder';
    }

    public function body(): string
    {
        return __('approval.fee_reminder_body', [
            'count' => $this->count,
            'amount' => number_format($this->amount, 2),
        ]);
    }

    public function url(): ?string
    {
        return route('parent.financials.index');
    }
}
