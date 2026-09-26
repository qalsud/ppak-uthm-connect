<?php

namespace App\Http\Controllers\Parent;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AttendanceController extends Controller
{
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

        $this->apply($attendance, $action, $request->user()->id);
        $attendance->save();

        return back()->with('success', __('approval.attendance_saved'));
    }

    private function apply(Attendance $attendance, string $action, int $userId): void
    {
        if ($action === 'arrive') {
            $attendance->arrived_at = now();
            $attendance->arrived_by = $userId;
            $attendance->departed_at = null;
            $attendance->departed_by = null;

            return;
        }

        $attendance->departed_at = now();
        $attendance->departed_by = $userId;

        if (! $attendance->arrived_at) {
            $attendance->arrived_at = now();
            $attendance->arrived_by = $userId;
        }
    }
}
