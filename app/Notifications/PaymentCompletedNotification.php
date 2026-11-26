<?php

namespace App\Notifications;

use App\Models\Payment;

class PaymentCompletedNotification extends BaseNotification
{
    public function __construct(private Payment $payment) {}

    public function category(): string
    {
        return self::CATEGORY_PAYMENTS;
    }

    public function priority(): string
    {
        return self::PRIORITY_HIGH;
    }

    protected function emailEnabledByDefault(): bool
    {
        return true;
    }

    public function studentId(): ?int
    {
        return $this->payment->student_id;
    }

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
