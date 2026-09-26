<?php

namespace App\Notifications;

use App\Models\Payment;

class PaymentCompletedNotification extends BaseNotification
{
    public function __construct(private Payment $payment) {}

    public function title(): string
    {
        return 'Pembayaran berjaya / Payment successful';
    }

    public function body(): string
    {
        return $this->payment->student->name.' — RM '.number_format((float) $this->payment->amount, 2);
    }

    public function url(): ?string
    {
        return route('parent.payments.success', $this->payment);
    }
}
