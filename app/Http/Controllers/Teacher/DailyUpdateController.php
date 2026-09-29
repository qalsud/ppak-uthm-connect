<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\DailyUpdate;
use App\Models\Student;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DailyUpdateController extends Controller
{
    public function index(Request $request): Response
    {
        $assigned = $request->user()->assignedClass();
        $selectedClass = $assigned
            ?? $request->input('class')
            ?? Student::defaultClassFor($request->user());

        $students = Student::query()
            ->active()
            ->visibleTo($request->user())
            ->inClass($selectedClass)
            ->orderBy('name')
            ->get(['id', 'name', 'class', 'centre_id']);

        $updates = DailyUpdate::query()
            ->whereIn('student_id', $students->pluck('id'))
            ->orderBy('date', 'desc')
            ->get()
            ->groupBy('student_id');

        $students->transform(function (Student $student) use ($updates) {
            $rows = $updates->get($student->id, collect());

            $student->latest_update = $rows->first();
            $student->updated_today = $student->latest_update?->date?->isToday() ?? false;
            $student->history = $rows->take(5)->map(fn ($u) => [
                'date' => $u->date->format('d M'),
                'sleep' => $u->sleep_status,
                'bath' => $u->bath_status,
                'health' => $u->health_status,
            ])->values();

            return $student;
        });

        $attendance = Attendance::todayFor($students->pluck('id'));
        $students->each(function (Student $student) use ($attendance) {
            $student->attendance = $attendance->get($student->id)?->summary() ?? Attendance::emptySummary();
        });

        return Inertia::render('Teacher/DailyUpdates', [
            'shell' => $request->user()->shell(),
            'students' => $students,
            'selectedClass' => $selectedClass,
            'assignedClass' => $assigned,
        ]);
    }
}
