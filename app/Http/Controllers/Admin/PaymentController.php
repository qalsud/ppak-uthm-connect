<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FeeSetting;
use App\Models\FinancialRecord;
use App\Models\Student;
use App\Notifications\FeeRecordAddedNotification;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
        $query = FinancialRecord::query()->with('student:id,name,class');

        if ($request->filled('month')) {
            $query->where('month', $request->string('month'));
        }

        if ($request->filled('class')) {
            $query->whereHas('student', fn ($q) => $q->where('class', $request->string('class')));
        }

        if (in_array($request->query('status'), ['paid', 'unpaid'], true)) {
            $query->where('status', $request->query('status'));
        }

        $records = $query->orderBy('created_at', 'desc')->get();

        $currentMonth = now()->format('F');

        return Inertia::render('Admin/Payments', [
            'records' => $records,
            'months' => self::MONTHS,
            'classes' => Student::CLASSES,
            'students' => Student::query()->orderBy('name')->get(['id', 'name', 'class']),
            'fee' => FeeSetting::current(),
            'summary' => [
                'collected_month' => (float) FinancialRecord::query()
                    ->where('status', 'paid')
                    ->where('month', $currentMonth)
                    ->sum('amount'),
                'outstanding' => (float) FinancialRecord::query()
                    ->where('status', 'unpaid')
                    ->sum('amount'),
                'unpaid_count' => FinancialRecord::query()->where('status', 'unpaid')->count(),
                'current_month' => $currentMonth,
            ],
            'filters' => [
                'month' => $request->string('month'),
                'class' => $request->string('class'),
                'status' => $request->query('status', ''),
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

        $exists = FinancialRecord::query()
            ->where('student_id', $data['student_id'])
            ->where('month', $data['month'])
            ->exists();

        if ($exists) {
            return back()->with('error', __('approval.duplicate_payment'));
        }

        $fee = FeeSetting::current();
        $overtimeAmount = $data['overtime_hours'] * $fee->overtime_rate;

        $record = FinancialRecord::create([
            'student_id' => $data['student_id'],
            'month' => $data['month'],
            'overtime_hours' => $data['overtime_hours'],
            'amount' => $fee->monthly_fee + $overtimeAmount,
            'status' => 'unpaid',
        ]);

        $student = Student::with('parent')->find($data['student_id']);

        if ($student?->parent) {
            Notification::send($student->parent, new FeeRecordAddedNotification($record));
        }

        return back()->with('success', __('approval.payment_created'));
    }

    /** Create unpaid records for every student for the given month, skipping existing ones. */
    public function generate(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'month' => ['required', Rule::in(self::MONTHS)],
        ]);

        $fee = FeeSetting::current();
        $created = 0;

        $students = Student::query()->with('parent')->get();

        foreach ($students as $student) {
            $exists = FinancialRecord::query()
                ->where('student_id', $student->id)
                ->where('month', $data['month'])
                ->exists();

            if ($exists) {
                continue;
            }

            $record = FinancialRecord::create([
                'student_id' => $student->id,
                'month' => $data['month'],
                'overtime_hours' => 0,
                'amount' => $fee->monthly_fee,
                'status' => 'unpaid',
            ]);

            if ($student->parent) {
                Notification::send($student->parent, new FeeRecordAddedNotification($record));
            }

            $created++;
        }

        return back()->with(
            'success',
            $created > 0
                ? __('approval.fees_generated', ['count' => $created, 'month' => $data['month']])
                : __('approval.fees_generated_none', ['month' => $data['month']])
        );
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

        return back()->with('success', __('approval.updated'));
    }

    public function destroy(Request $request, FinancialRecord $record): RedirectResponse
    {
        $record->delete();

        return back()->with('success', __('approval.deleted'));
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
