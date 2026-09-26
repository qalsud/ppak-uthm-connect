<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceController extends Controller
{
    public function index(Request $request): Response
    {
        $class = in_array($request->query('class'), Student::CLASSES, true)
            ? $request->query('class')
            : Student::CLASSES[0];

        $date = $this->resolveDate($request->query('date'));

        $students = Student::query()
            ->where('class', $class)
            ->orderBy('name')
            ->get(['id', 'name', 'class']);

        $records = Attendance::onDateFor($students->pluck('id'), $date);

        $students->each(function (Student $student) use ($records) {
            $student->attendance = $records->get($student->id)?->summary() ?? Attendance::emptySummary();
        });

        return Inertia::render('Teacher/Attendance', [
            'students' => $students,
            'selectedClass' => $class,
            'date' => $date,
            'isToday' => $date === today()->toDateString(),
            'counts' => [
                'school' => $students->filter(fn ($s) => $s->attendance['status'] === 'school')->count(),
                'home' => $students->filter(fn ($s) => $s->attendance['status'] === 'home')->count(),
                'none' => $students->filter(fn ($s) => $s->attendance['status'] === 'none')->count(),
            ],
        ]);
    }

    public function store(Request $request, Student $student): RedirectResponse
    {
        $data = $request->validate([
            'action' => ['required', Rule::in(['arrive', 'depart'])],
            'date' => ['nullable', 'date', 'before_or_equal:today'],
        ]);

        $date = $data['date'] ?? today()->toDateString();

        $attendance = Attendance::firstOrNew([
            'student_id' => $student->id,
            'date' => $date,
        ]);

        $userId = $request->user()->id;

        if ($data['action'] === 'arrive') {
            $attendance->markArrival($userId);
        } else {
            $attendance->markDeparture($userId);
        }

        $attendance->save();

        return back()->with('success', __('approval.attendance_saved'));
    }

    private function resolveDate(?string $date): string
    {
        if (! $date) {
            return today()->toDateString();
        }

        try {
            $parsed = Carbon::parse($date)->toDateString();
        } catch (\Throwable) {
            return today()->toDateString();
        }

        // Never allow a future register.
        return $parsed > today()->toDateString() ? today()->toDateString() : $parsed;
    }
}
