<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\DailyActivity;
use App\Models\DailyUpdate;
use App\Models\Memo;
use App\Models\Student;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $today = today()->toDateString();

        $assigned = auth()->user()->assignedClass();

        $students = Student::query()
            ->active()
            ->visibleTo(auth()->user())
            ->orderBy('name')
            ->get(['id', 'name', 'class']);

        $todayActivities = DailyActivity::query()
            ->where('date', $today)
            ->where('teacher_id', auth()->id())
            ->pluck('student_id')
            ->flip();

        $todayUpdates = DailyUpdate::query()
            ->where('date', $today)
            ->pluck('student_id')
            ->flip();

        $students->transform(function (Student $student) use ($todayActivities, $todayUpdates) {
            $student->activity_logged = $todayActivities->has($student->id);
            $student->update_received = $todayUpdates->has($student->id);

            return $student;
        });

        $attendance = Attendance::todayFor($students->pluck('id'));
        $students->each(function (Student $student) use ($attendance) {
            $student->attendance = $attendance->get($student->id)?->summary() ?? Attendance::emptySummary();
        });

        $recentActivities = DailyActivity::query()
            ->with('student:id,name,class')
            ->latest('date')
            ->limit(6)
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'date' => $a->date->format('d M Y'),
                'student' => $a->student?->name ?? '—',
            ]);

        return Inertia::render('Teacher/Dashboard', [
            'students' => $students,
            'today' => $today,
            'assignedClass' => $assigned,
            'activityCount' => $todayActivities->count(),
            'updateCount' => $todayUpdates->count(),
            'memoCount' => Memo::query()->visibleTo(auth()->user())->count(),
            'recentActivities' => $recentActivities,
        ]);
    }
}
