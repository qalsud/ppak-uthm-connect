<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\DailyActivity;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ActivityController extends Controller
{
    public function index(Request $request): Response
    {
        $students = Student::query()->orderBy('name')->get(['id', 'name', 'class']);
        $today = $request->input('date', today()->toDateString());

        $records = DailyActivity::query()
            ->with('student:id,name,class')
            ->orderBy('date', 'desc')
            ->limit(30)
            ->get();

        return Inertia::render('Teacher/Activities', [
            'students' => $students,
            'today' => $today,
            'fields' => DailyActivity::FIELDS,
            'records' => $records,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'student_id' => 'required|exists:students,id',
            'date' => 'required|date|before_or_equal:today',
            'treatment_notes' => 'nullable|string|max:1000',
            'statuses' => ['required', 'array'],
            'statuses.*' => [Rule::in(['yes', 'no'])],
        ]);

        $data = [
            'student_id' => $validated['student_id'],
            'teacher_id' => $request->user()->id,
            'date' => $validated['date'],
            'treatment_notes' => $validated['treatment_notes'] ?? null,
        ];

        foreach (array_keys(DailyActivity::FIELDS) as $field) {
            $data[$field] = $validated['statuses'][$field] ?? 'no';
        }

        $record = DailyActivity::query()
            ->where('student_id', $data['student_id'])
            ->whereDate('date', $validated['date'])
            ->first();

        if ($record) {
            $record->update($data);
        } else {
            DailyActivity::create($data);
        }

        return back()->with('success', __('approval.activity_saved'));
    }
}
