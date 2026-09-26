<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\DailyUpdate;
use App\Models\Student;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DailyUpdateController extends Controller
{
    public function index(Request $request): Response
    {
        $selectedClass = $request->input('class', '5tahun');

        $students = Student::query()
            ->where('class', $selectedClass)
            ->orderBy('name')
            ->get(['id', 'name', 'class']);

        $updates = DailyUpdate::query()
            ->whereIn('student_id', $students->pluck('id'))
            ->orderBy('date', 'desc')
            ->get()
            ->groupBy('student_id')
            ->map(fn ($rows) => $rows->first());

        $students->transform(function (Student $student) use ($updates) {
            $student->latest_update = $updates->get($student->id);
            $student->updated_today = $student->latest_update?->date?->isToday() ?? false;

            return $student;
        });

        return Inertia::render('Teacher/DailyUpdates', [
            'students' => $students,
            'selectedClass' => $selectedClass,
        ]);
    }
}
