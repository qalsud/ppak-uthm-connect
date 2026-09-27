<?php

namespace App\Http\Controllers\Parent;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Services\Payments\PaymentCompletionService;
use App\Services\Payments\StripeCheckoutService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    public function __construct(
        private StripeCheckoutService $checkout,
        private PaymentCompletionService $completion,
    ) {}

    public function checkout(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'student_id' => ['required', 'integer', 'exists:students,id'],
            'record_ids' => ['nullable', 'array'],
            'record_ids.*' => ['integer', 'exists:financial_records,id'],
        ]);

        $student = $request->user()
            ->students()
            ->with('financialRecords')
            ->whereKey($validated['student_id'])
            ->firstOrFail();

        $unpaid = $student->financialRecords->where('status', 'unpaid');

        // Pay only the selected months when the parent chose them.
        if (! empty($validated['record_ids'])) {
            $unpaid = $unpaid->whereIn('id', $validated['record_ids']);
        }

        $amount = $unpaid->sum('amount');
        $coveredIds = $unpaid->pluck('id')->values()->all();

        if ($amount <= 0) {
            return back()->with('error', __('payments.nothing_due'));
        }

        if (! $this->checkout->isConfigured()) {
            return back()->with('error', __('payments.unavailable'));
        }

        $payment = Payment::create([
            'user_id' => $request->user()->id,
            'student_id' => $student->id,
            'amount' => $amount,
            'financial_record_ids' => $coveredIds,
            'status' => 'pending',
        ]);

        try {
            $session = $this->checkout->createSession($payment, $request->user(), $student);

            return Redirect::away($session['url']);
        } catch (\Throwable $e) {
            report($e);
            $payment->delete();

            return back()->with('error', __('payments.failed'));
        }
    }

    public function success(Payment $payment): Response|RedirectResponse
    {
        abort_unless($payment->user_id === auth()->id(), 403);

        // Local fallback: without a Stripe webhook configured (e.g. in dev),
        // confirm the session directly so the flow still completes.
        if ($payment->status === 'pending' && $this->checkout->isConfigured() && $this->checkout->isSessionPaid($payment)) {
            $this->completion->complete($payment);
        }

        return Inertia::render('Parent/PaymentSuccess', [
            'payment' => $payment,
            'records' => $this->completion->coveredRecords($payment),
        ]);
    }

    public function receipt(Payment $payment)
    {
        abort_unless($payment->user_id === auth()->id(), 403);

        if ($payment->status !== 'paid') {
            return back()->with('error', __('payments.not_paid'));
        }

        $pdf = Pdf::loadView('pdf.receipt', [
            'payment' => $payment,
            'records' => $this->completion->coveredRecords($payment),
            'issuedAt' => now(),
        ]);

        return $pdf->download('resit-ppak-uthm-'.$payment->id.'.pdf');
    }
}
