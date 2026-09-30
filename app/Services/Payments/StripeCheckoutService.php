<?php

namespace App\Services\Payments;

use App\Models\Payment;
use App\Models\Student;
use App\Models\User;
use RuntimeException;
use Stripe\Checkout\Session as StripeSession;
use Stripe\Refund as StripeRefund;
use Stripe\Stripe;

class StripeCheckoutService
{
    public function isConfigured(): bool
    {
        return (bool) config('services.stripe.secret_key')
            && (bool) config('services.stripe.publishable_key');
    }

    /**
     * Create a Stripe Checkout Session for a payment. The amount is always
     * computed & stored server-side; the client never chooses what to pay.
     *
     * @return array{id: string, url: string}
     */
    public function createSession(Payment $payment, User $parent, Student $student): array
    {
        Stripe::setApiKey(config('services.stripe.secret_key'));

        $session = StripeSession::create([
            'payment_method_types' => ['card'],
            'mode' => 'payment',
            'line_items' => [[
                'price_data' => [
                    'currency' => config('services.stripe.currency', 'myr'),
                    'unit_amount' => (int) round((float) $payment->amount * 100),
                    'product_data' => [
                        'name' => 'PPAK UTHM - Yuran / Fees',
                        'description' => $student->name.' ('.$student->class_label.')',
                    ],
                ],
                'quantity' => 1,
            ]],
            'metadata' => ['payment_id' => (string) $payment->id],
            'customer_email' => $parent->email,
            'success_url' => route('parent.payments.success', $payment).'?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => route('parent.financials'),
        ]);

        $payment->update(['stripe_session_id' => $session->id]);

        return ['id' => $session->id, 'url' => $session->url];
    }

    /**
     * Confirm a session's payment status directly from Stripe (used as a local
     * fallback when webhooks are not configured — e.g. the dev environment).
     */
    public function isSessionPaid(Payment $payment): bool
    {
        if (! $this->isConfigured() || ! $payment->stripe_session_id) {
            return false;
        }

        Stripe::setApiKey(config('services.stripe.secret_key'));

        $session = StripeSession::retrieve($payment->stripe_session_id);

        return $session->payment_status === 'paid'
            || $session->status === 'complete';
    }

    /**
     * Refund a completed payment in full via Stripe and return the refund id.
     *
     * @throws RuntimeException when Stripe is unavailable or the payment has no
     *                          retrievable payment intent.
     */
    public function refund(Payment $payment): string
    {
        if (! $this->isConfigured() || ! $payment->stripe_session_id) {
            throw new RuntimeException('Stripe is not configured for this payment.');
        }

        Stripe::setApiKey(config('services.stripe.secret_key'));

        $session = StripeSession::retrieve($payment->stripe_session_id);
        $intent = $session->payment_intent;

        if (! $intent) {
            throw new RuntimeException('The payment has no charge to refund.');
        }

        $refund = StripeRefund::create([
            'payment_intent' => is_string($intent) ? $intent : $intent->id,
        ]);

        return $refund->id;
    }
}
