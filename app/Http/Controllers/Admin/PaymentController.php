<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FeeSetting;
use App\Models\FinancialRecord;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    public function index(Request $request): Response
    {
        $query = FinancialRecord::query()->with('student:id,name,class');

        if ($request->filled('month')) {
            $query->where('month', $request->string('month'));
        }

        if ($request->filled('class')) {
            $query->whereHas('student', fn ($q) => $q->where('class', $request->string('class')));
        }

        $records = $query->orderBy('created_at', 'desc')->get();

        $months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December',
        ];

        return Inertia::render('Admin/Payments', [
            'records' => $records,
            'months' => $months,
            'classes' => Student::CLASSES,
            'fee' => FeeSetting::current(),
            'filters' => [
                'month' => $request->string('month'),
                'class' => $request->string('class'),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'student_id' => 'required|exists:students,id',
            'month' => ['required', Rule::in([
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December',
            ])],
            'overtime_hours' => 'required|numeric|min:0',
        ]);

        $fee = FeeSetting::current();
        $overtimeAmount = $data['overtime_hours'] * $fee->overtime_rate;

        $exists = FinancialRecord::query()
            ->where('student_id', $data['student_id'])
            ->where('month', $data['month'])
            ->exists();

        if ($exists) {
            return back()->with('error', __('approval.duplicate_payment'));
        }

        FinancialRecord::create([
            'student_id' => $data['student_id'],
            'month' => $data['month'],
            'overtime_hours' => $data['overtime_hours'],
            'amount' => $fee->monthly_fee + $overtimeAmount,
            'status' => 'unpaid',
        ]);

        return back()->with('success', __('approval.payment_created'));
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
}
