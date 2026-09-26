<?php

namespace App\Services\Payments;

use App\Models\FinancialRecord;
use App\Models\Payment;
use App\Notifications\PaymentCompletedNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class PaymentCompletionService
{
    /**
     * Mark a checkout session's payment as completed. This is idempotent:
     * running it twice never double-marks financial records.
     */
    public function markSessionCompleted(string $stripeSessionId): ?Payment
    {
        $payment = Payment::query()
            ->where('stripe_session_id', $stripeSessionId)
            ->first();

        return $payment ? $this->complete($payment) : null;
    }

    public function complete(Payment $payment): Payment
    {
        if ($payment->status === 'paid') {
            return $payment->fresh();
        }

        $result = DB::transaction(function () use ($payment) {
            $unpaid = FinancialRecord::query()
                ->where('student_id', $payment->student_id)
                ->where('status', 'unpaid')
                ->get();

            foreach ($unpaid as $record) {
                $record->update(['status' => 'paid', 'paid_on' => now()]);
            }

            $payment->update(['status' => 'paid', 'paid_at' => now()]);

            return $payment->fresh();
        });

        $parent = $result->user;

        Notification::send($parent, new PaymentCompletedNotification($result));

        return $result;
    }
}
