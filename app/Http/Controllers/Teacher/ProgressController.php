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
    public function index(): Response
    {
        $students = Student::query()->orderBy('name')->get(['id', 'name', 'class']);
        $records = ProgressRecord::query()
            ->with('student:id,name,class')
            ->orderBy('date', 'desc')
            ->limit(30)
            ->get();

        return Inertia::render('Teacher/Progress', [
            'students' => $students,
            'records' => $records,
            'permata' => ProgressRecord::PERMATA,
            'free' => ProgressRecord::FREE,
            'development' => ProgressRecord::DEVELOPMENT,
            'grades' => ProgressRecord::GRADES,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'student_id' => 'required|exists:students,id',
            'date' => 'required|date',
            'sub_theme' => 'nullable|string|max:255',
            'activity_done' => ['required', Rule::in(['Select', ...ProgressRecord::GRADES])],
            'child_proficiency' => ['required', Rule::in(['Select', ...ProgressRecord::GRADES])],
            'permata_activity' => ['required', Rule::in(['Select', ...ProgressRecord::PERMATA])],
            'free_activity' => ['required', Rule::in(['Select', ...ProgressRecord::FREE])],
            'development_proficiency' => ['required', Rule::in(['Select', ...ProgressRecord::DEVELOPMENT])],
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
