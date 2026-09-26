<?php

namespace App\Http\Controllers\Teacher;

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
        $action = $request->validate([
            'action' => ['required', Rule::in(['arrive', 'depart'])],
        ])['action'];

        $attendance = Attendance::firstOrNew([
            'student_id' => $student->id,
            'date' => today()->toDateString(),
        ]);

        if ($action === 'arrive') {
            $attendance->arrived_at = now();
            $attendance->arrived_by = $request->user()->id;
            $attendance->departed_at = null;
            $attendance->departed_by = null;
        } else {
            $attendance->departed_at = now();
            $attendance->departed_by = $request->user()->id;

            if (! $attendance->arrived_at) {
                $attendance->arrived_at = now();
                $attendance->arrived_by = $request->user()->id;
            }
        }

        $attendance->save();

        return back()->with('success', __('approval.attendance_saved'));
    }
}
