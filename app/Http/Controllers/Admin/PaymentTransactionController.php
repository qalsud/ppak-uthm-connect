<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\FinancialRecord;
use App\Models\Payment;
use App\Services\Payments\PaymentCompletionService;
use App\Services\Payments\StripeCheckoutService;
use App\Support\ActiveCentre;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Oversight of online (Stripe) payments: list, detail and refund.
 */
class PaymentTransactionController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->query('status');
        $search = trim((string) $request->query('search', ''));
        $centreId = ActiveCentre::id();

        // Payments belong to a centre through their child.
        $inCentre = fn ($q) => $q->when(
            $centreId,
            fn ($qq) => $qq->whereHas('student', fn ($s) => $s->where('centre_id', $centreId)),
        );

        $payments = $inCentre(Payment::query()->with(['student:id,name,class', 'user:id,name,email']))
            ->when(in_array($status, ['pending', 'paid', 'refunded', 'failed'], true), fn ($q) => $q->where('status', $status))
            ->when($search !== '', fn ($q) => $q->where(function ($w) use ($search) {
                $w->whereHas('student', fn ($s) => $s->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$search}%"))
                    ->orWhere('stripe_session_id', 'like', "%{$search}%");
            }))
            ->orderByDesc('id')
            ->paginate(15)
            ->withQueryString();

        // Attach the covered months in one extra query (no N+1).
        $ids = collect($payments->items())
            ->flatMap(fn (Payment $p) => $p->financial_record_ids ?? [])
            ->unique()
            ->values();

        $records = FinancialRecord::query()
            ->whereIn('id', $ids)
            ->get(['id', 'month', 'amount', 'status'])
            ->keyBy('id');

        $payments->getCollection()->transform(function (Payment $payment) use ($records) {
            $payment->setAttribute('covered', collect($payment->financial_record_ids ?? [])
                ->map(fn ($id) => $records->get($id))
                ->filter()
                ->map(fn ($r) => ['id' => $r->id, 'month' => $r->month, 'amount' => (float) $r->amount, 'status' => $r->status])
                ->values()
                ->all());

            return $payment;
        });

        return Inertia::render('Admin/Transactions', [
            'payments' => $payments,
            'signals' => [
                'collected' => (float) $inCentre(Payment::query())->where('status', 'paid')->sum('amount'),
                'refunded' => (float) $inCentre(Payment::query())->where('status', 'refunded')->sum('refunded_amount'),
                'paid_count' => $inCentre(Payment::query())->where('status', 'paid')->count(),
                'refunded_count' => $inCentre(Payment::query())->where('status', 'refunded')->count(),
            ],
            'stripeConfigured' => app(StripeCheckoutService::class)->isConfigured(),
            'filters' => ['status' => $status ?? '', 'search' => $search],
        ]);
    }

    public function refund(
        Request $request,
        Payment $payment,
        StripeCheckoutService $stripe,
        PaymentCompletionService $completion,
    ): RedirectResponse {
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        if ($payment->status !== 'paid') {
            return back()->with('error', __('payments.not_refundable'));
        }

        if (! $stripe->isConfigured()) {
            return back()->with('error', __('payments.refund_unavailable'));
        }

        // A double-submit must never create two Stripe refunds.
        $lock = Cache::lock("payment-refund:{$payment->id}", 15);

        if (! $lock->get()) {
            return back()->with('error', __('payments.refund_in_progress'));
        }

        try {
            $refundId = $stripe->refund($payment);

            $completion->refund($payment, $refundId, $data['reason'] ?? null);
        } catch (\Throwable $e) {
            report($e);

            return back()->with('error', __('payments.refund_failed'));
        } finally {
            $lock->release();
        }

        ActivityLog::record('payment.refunded', $payment, $payment->student?->name, [
            'refund_id' => $refundId,
        ]);

        return back()->with('success', __('payments.refunded'));
    }
}
