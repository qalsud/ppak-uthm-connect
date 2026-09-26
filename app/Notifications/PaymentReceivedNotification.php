<?php

namespace App\Notifications;

use App\Models\Payment;

class PaymentReceivedNotification extends BaseNotification
{
    public function __construct(private Payment $payment) {}

    public function title(): string
    {
        return 'Bayaran diterima / Payment received';
    }

    public function body(): string
    {
        $student = $this->payment->student?->name ?? '—';

        return $student.' · RM '.number_format((float) $this->payment->amount, 2);
    }

    public function url(): ?string
    {
        return route('admin.payments.index');
    }
}
