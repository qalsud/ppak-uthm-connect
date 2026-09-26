<?php

namespace App\Http\Controllers\Parent;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceController extends Controller
{
    public function index(Request $request): Response
    {
        $children = $request->user()
            ->students()
            ->get(['id', 'name', 'class']);

        $today = Attendance::todayFor($children->pluck('id'));

        $children->each(function (Student $child) use ($today) {
            $child->attendance = $today->get($child->id)?->summary() ?? Attendance::emptySummary();
            $child->history = Attendance::historyFor($child->id)
                ->map(fn (Attendance $a) => $a->historyRow())
                ->values();
        });

        return Inertia::render('Parent/Attendance', [
            'children' => $children,
        ]);
    }

    public function store(Request $request, Student $student): RedirectResponse
    {
        abort_unless($student->parent_id === $request->user()->id, 403);

        $action = $request->validate([
            'action' => ['required', Rule::in(['arrive', 'depart'])],
        ])['action'];

        $attendance = Attendance::firstOrNew([
            'student_id' => $student->id,
            'date' => today()->toDateString(),
        ]);

        $userId = $request->user()->id;

        if ($action === 'arrive') {
            $attendance->markArrival($userId);
        } else {
            $attendance->markDeparture($userId);
        }

        $attendance->save();

        return back()->with('success', __('approval.attendance_saved'));
    }
}
