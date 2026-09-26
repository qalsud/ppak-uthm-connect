<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\DailyActivity;
use App\Models\DailyUpdate;
use App\Models\Student;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $today = today()->toDateString();

        $students = Student::query()
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

        return Inertia::render('Teacher/Dashboard', [
            'students' => $students,
            'today' => $today,
        ]);
    }
}
