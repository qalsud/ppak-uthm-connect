<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\ProgressRecord;
use App\Models\Student;
use App\Notifications\ProgressRecordedNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProgressController extends Controller
{
    public function index(Request $request): Response
    {
        $students = Student::query()->orderBy('name')->get(['id', 'name', 'class']);

        $studentId = $request->query('student');
        $class = $request->query('class');

        $query = ProgressRecord::query()->with([
            'student:id,name,class',
            'teacher:id,name',
        ]);

        if ($studentId) {
            $query->where('student_id', $studentId);
        }

        if (in_array($class, Student::CLASSES, true)) {
            $query->whereHas('student', fn ($q) => $q->where('class', $class));
        }

        $records = $query->orderByDesc('date')->limit(60)->get();

        $summary = null;

        if ($studentId) {
            $latest = ProgressRecord::query()
                ->where('student_id', $studentId)
                ->orderByDesc('date')
                ->first();

            $summary = [
                'count' => ProgressRecord::query()->where('student_id', $studentId)->count(),
                'last_date' => $latest?->date?->format('Y-m-d'),
                'latest' => $latest ? [
                    'activity_performance' => $latest->activity_done,
                    'skill_mastery' => $latest->child_proficiency,
                    'development_area' => $latest->development_proficiency,
                ] : null,
            ];
        }

        return Inertia::render('Teacher/Progress', [
            'students' => $students,
            'records' => $records,
            'summary' => $summary,
            'permata' => ProgressRecord::PERMATA,
            'free' => ProgressRecord::FREE,
            'development' => ProgressRecord::DEVELOPMENT,
            'grades' => ProgressRecord::GRADES,
            'filters' => [
                'student' => $studentId ? (string) $studentId : '',
                'class' => $class ?? '',
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'student_id' => 'required|exists:students,id',
            'date' => 'required|date|before_or_equal:today',
            'sub_theme' => 'nullable|string|max:255',
            'activity_done' => ['required', Rule::in(ProgressRecord::GRADES)],
            'child_proficiency' => ['required', Rule::in(ProgressRecord::GRADES)],
            'permata_activity' => ['required', Rule::in(ProgressRecord::PERMATA)],
            'free_activity' => ['required', Rule::in(ProgressRecord::FREE)],
            'development_proficiency' => ['required', Rule::in(ProgressRecord::DEVELOPMENT)],
            'notes' => 'nullable|string|max:1000',
        ]);

        $validated['teacher_id'] = $request->user()->id;

        $record = ProgressRecord::query()
            ->where('student_id', $validated['student_id'])
            ->whereDate('date', $validated['date'])
            ->first();

        if ($record) {
            $record->update($validated);
        } else {
            ProgressRecord::create($validated);
        }

        $student = Student::with('parent')->find($validated['student_id']);

        if ($student?->parent) {
            Notification::send($student->parent, new ProgressRecordedNotification($student));
        }

        return back()->with('success', __('approval.progress_saved'));
    }
}
