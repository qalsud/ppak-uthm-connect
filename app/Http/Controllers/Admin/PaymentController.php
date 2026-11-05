<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\FeeSetting;
use App\Models\FinancialRecord;
use App\Models\Student;
use App\Notifications\FeeRecordAddedNotification;
use App\Support\ActiveCentre;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    public const MONTHS = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];

    public function index(Request $request): Response
    {
        $centreId = ActiveCentre::id();

        // Fee records belong to a centre through their child.
        $query = FinancialRecord::query()->with('student:id,name,class')->forActiveCentre();

        if ($request->filled('month')) {
            $query->where('month', $request->string('month'));
        }

        if ($request->filled('class')) {
            $query->whereHas('student', fn ($q) => $q->where('class', $request->string('class')));
        }

        if (in_array($request->query('status'), ['paid', 'unpaid'], true)) {
            $query->where('status', $request->query('status'));
        }

        $search = trim((string) $request->query('search', ''));

        if ($search !== '') {
            $query->whereHas('student', fn ($q) => $q->where('name', 'like', "%{$search}%"));
        }

        $records = $query->orderBy('created_at', 'desc')->paginate(15)->withQueryString();

        // Flag overdue records so the list can highlight them.
        $records->getCollection()->transform(function (FinancialRecord $record) {
            $record->setAttribute('overdue', $record->isOverdue());

            return $record;
        });

        $currentMonth = now()->format('F');

        return Inertia::render('Admin/Payments', [
            'records' => $records,
            'months' => self::MONTHS,
            'classes' => Student::classKeys(),
            'students' => Student::query()->active()->forActiveCentre()->orderBy('name')->get(['id', 'name', 'class']),
            'fee' => FeeSetting::current($centreId),
            'summary' => [
                'collected_month' => (float) FinancialRecord::query()
                    ->forActiveCentre()
                    ->where('status', 'paid')
                    ->where('month', $currentMonth)
                    ->sum('amount'),
                'outstanding' => (float) FinancialRecord::query()
                    ->forActiveCentre()
                    ->where('status', 'unpaid')
                    ->sum('amount'),
                'unpaid_count' => FinancialRecord::query()->forActiveCentre()->where('status', 'unpaid')->count(),
                'current_month' => $currentMonth,
            ],
            'filters' => [
                'month' => $request->string('month'),
                'class' => $request->string('class'),
                'status' => $request->query('status', ''),
                'search' => $search,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'student_id' => 'required|exists:students,id',
            'month' => ['required', Rule::in(self::MONTHS)],
            'overtime_hours' => 'required|numeric|min:0',
        ]);

        $existing = $this->forMonth((int) $data['student_id'], $data['month']);

        // A live record is a duplicate; a trashed one is restored in place so the
        // unique (student_id, month) index can never be violated by re-adding it.
        if ($existing && ! $existing->trashed()) {
            return back()->with('error', __('approval.duplicate_payment'));
        }

        $student = Student::with('parent')->findOrFail($data['student_id']);

        // Use the rate for the child's centre, falling back to the global rate.
        $fee = FeeSetting::current($student->centre_id);
        $overtimeAmount = $data['overtime_hours'] * $fee->overtime_rate;

        $attributes = [
            'due_on' => $this->dueDateFor($data['month']),
            'overtime_hours' => $data['overtime_hours'],
            'amount' => $fee->monthly_fee + $overtimeAmount,
            'status' => 'unpaid',
            'paid_on' => null,
            'stripe_session_id' => null,
            'ReceiptGenerated' => false,
        ];

        if ($existing) {
            $existing->restore();
            $existing->update($attributes);
            $record = $existing->fresh();
        } else {
            $record = FinancialRecord::create([
                'student_id' => $data['student_id'],
                'month' => $data['month'],
                ...$attributes,
            ]);
        }

        if ($student?->parent) {
            Notification::send($student->parent, new FeeRecordAddedNotification($record));
        }

        ActivityLog::record('payment.created', $record, ($student?->name ?? '—').' · '.$data['month'], [
            'amount' => $record->amount,
        ]);

        return back()->with('success', __('approval.payment_created'));
    }

    /** Create unpaid records for every student for the given month, skipping existing ones. */
    public function generate(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'month' => ['required', Rule::in(self::MONTHS)],
        ]);

        $created = 0;

        $students = Student::query()->active()->with('parent')->get();

        foreach ($students as $student) {
            $existing = $this->forMonth($student->id, $data['month']);

            if ($existing && ! $existing->trashed()) {
                continue;
            }

            // A centre may have its own rate; otherwise the global rate applies.
            $fee = FeeSetting::current($student->centre_id);

            $attributes = [
                'due_on' => $this->dueDateFor($data['month']),
                'overtime_hours' => 0,
                'amount' => $fee->monthly_fee,
                'status' => 'unpaid',
                'paid_on' => null,
                'stripe_session_id' => null,
                'ReceiptGenerated' => false,
            ];

            if ($existing) {
                $existing->restore();
                $existing->update($attributes);
                $record = $existing->fresh();
            } else {
                $record = FinancialRecord::create([
                    'student_id' => $student->id,
                    'month' => $data['month'],
                    ...$attributes,
                ]);
            }

            if ($student->parent) {
                Notification::send($student->parent, new FeeRecordAddedNotification($record));
            }

            $created++;
        }

        ActivityLog::record('payment.generated', null, $data['month'], ['created' => $created]);

        return back()->with(
            'success',
            $created > 0
                ? __('approval.fees_generated', ['count' => $created, 'month' => $data['month']])
                : __('approval.fees_generated_none', ['month' => $data['month']])
        );
    }

    /** Edit a fee record (amount, month, overtime and due date). */
    public function update(Request $request, FinancialRecord $record): RedirectResponse
    {
        $data = $request->validate([
            'month' => ['required', Rule::in(self::MONTHS)],
            'amount' => ['required', 'numeric', 'min:0', 'max:100000'],
            'overtime_hours' => ['required', 'numeric', 'min:0', 'max:1000'],
            'due_on' => ['nullable', 'date'],
        ]);

        $record->update([
            'month' => $data['month'],
            'amount' => $data['amount'],
            'overtime_hours' => $data['overtime_hours'],
            'due_on' => $data['due_on'] ?? null,
        ]);

        ActivityLog::record('payment.updated', $record, $record->student?->name.' · '.$data['month'], $data);

        return back()->with('success', __('approval.updated'));
    }

    public function updateStatus(Request $request, FinancialRecord $record): RedirectResponse
    {
        $request->validate([
            'status' => ['required', Rule::in(['paid', 'unpaid'])],
        ]);

        $newStatus = $request->input('status');

        $record->update([
            'status' => $newStatus,
            'paid_on' => $newStatus === 'paid' ? now() : null,
        ]);

        ActivityLog::record('payment.status', $record, $record->student?->name.' · '.$newStatus);

        return back()->with('success', __('approval.updated'));
    }

    public function destroy(Request $request, FinancialRecord $record): RedirectResponse
    {
        ActivityLog::record('payment.deleted', null, $record->student?->name.' · '.$record->month);

        $record->delete();

        return back()->with('success', __('approval.deleted'));
    }

    /**
     * The fee record for a student/month, including a soft-deleted one. Reusing
     * the trashed row keeps the unique index valid while preserving Trash.
     */
    private function forMonth(int $studentId, string $month): ?FinancialRecord
    {
        return FinancialRecord::withTrashed()
            ->where('student_id', $studentId)
            ->where('month', $month)
            ->first();
    }

    /**
     * The due date for a month: the configured due day (settings → fees,
     * default 7) in the current year.
     */
    private function dueDateFor(string $month): string
    {
        $day = (int) setting('fees.due_day', 7);

        try {
            return Carbon::parse("{$day} {$month}")->toDateString();
        } catch (\Throwable) {
            return today()->addDays($day)->toDateString();
        }
    }

    /** Download a PDF receipt for a paid fee record. */
    public function receipt(FinancialRecord $record)
    {
        abort_unless($record->status === 'paid', 404);

        $record->load('student.parent');
        $record->forceFill(['ReceiptGenerated' => true])->save();

        $pdf = Pdf::loadView('pdf.financial-receipt', [
            'record' => $record,
            'issuedAt' => now(),
        ]);

        return $pdf->download('resit-ppak-uthm-'.$record->id.'.pdf');
    }
}
