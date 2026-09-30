<?php

namespace App\Services\Payments;

use App\Models\FinancialRecord;
use App\Models\Payment;
use App\Notifications\PaymentCompletedNotification;
use App\Notifications\PaymentReceivedNotification;
use App\Support\AdminNotifier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class PaymentCompletionService
{
    /**
     * Mark a checkout session's payment as completed. This is idempotent and
     * only ever marks the records that were captured when the session was made.
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
            $ids = $payment->financial_record_ids ?? [];

            // Only mark the snapshotted records; fall back to the student's
            // currently-unpaid records for legacy payments without a snapshot.
            $query = FinancialRecord::query()->where('status', 'unpaid');

            if (! empty($ids)) {
                $query->whereIn('id', $ids);
            } else {
                $query->where('student_id', $payment->student_id);
            }

            foreach ($query->get() as $record) {
                $record->update([
                    'status' => 'paid',
                    'paid_on' => now(),
                    'ReceiptGenerated' => true,
                ]);
            }

            $payment->update(['status' => 'paid', 'paid_at' => now()]);

            return $payment->fresh();
        });

        Notification::send($result->user, new PaymentCompletedNotification($result));
        AdminNotifier::send(new PaymentReceivedNotification($result));

        return $result;
    }

    /**
     * Refund a completed payment: mark it refunded and put its covered fee
     * records back to unpaid (the fee is owed again). Idempotent.
     */
    public function refund(Payment $payment, ?string $refundId = null, ?string $reason = null): Payment
    {
        if ($payment->status === 'refunded') {
            return $payment->fresh();
        }

        return DB::transaction(function () use ($payment, $refundId, $reason) {
            $ids = $payment->financial_record_ids ?? [];

            $query = FinancialRecord::query()->where('status', 'paid');

            if (! empty($ids)) {
                $query->whereIn('id', $ids);
            } else {
                $query->where('student_id', $payment->student_id);
            }

            foreach ($query->get() as $record) {
                $record->update([
                    'status' => 'unpaid',
                    'paid_on' => null,
                    'ReceiptGenerated' => false,
                    'stripe_session_id' => null,
                ]);
            }

            $payment->update([
                'status' => 'refunded',
                'refund_id' => $refundId,
                'refunded_amount' => $payment->amount,
                'refund_reason' => $reason,
                'refunded_at' => now(),
            ]);

            return $payment->fresh();
        });
    }

    /** The financial records this payment covers (for the success page/receipt). */
    public function coveredRecords(Payment $payment)
    {
        $ids = $payment->financial_record_ids ?? [];

        if (! empty($ids)) {
            return FinancialRecord::query()
                ->whereIn('id', $ids)
                ->orderBy('month')
                ->get();
        }

        return $payment->student->financialRecords()
            ->where('status', 'paid')
            ->orderBy('month')
            ->get();
    }
}
