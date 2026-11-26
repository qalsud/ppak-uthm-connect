<?php

namespace App\Http\Controllers\Parent;

use App\Http\Controllers\Controller;
use App\Models\MedicationRequest;
use App\Models\Student;
use App\Models\User;
use App\Notifications\MedicationRequestedNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;

class MedicationController extends Controller
{
    /** A parent asks staff to give their child medicine on a given day. */
    public function store(Request $request, Student $student): RedirectResponse
    {
        abort_unless($student->parent_id === $request->user()->id, 403);

        $data = $request->validate([
            'date' => [
                'required',
                'date',
                'after_or_equal:today',
                'before_or_equal:'.today()->addDays(30)->toDateString(),
            ],
            'medicine' => ['required', 'string', 'max:255'],
            'dosage' => ['nullable', 'string', 'max:100'],
            'time_due' => ['nullable', 'string', 'max:10'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $medication = MedicationRequest::create([
            ...$data,
            'student_id' => $student->id,
            'requested_by' => $request->user()->id,
            'status' => 'pending',
        ]);

        // Tell the teaching team at this child's centre so the request is not
        // missed before the medicine is due.
        $teachers = User::staffForStudent($student);

        if ($teachers->isNotEmpty()) {
            Notification::send($teachers, new MedicationRequestedNotification($medication));
        }

        return back()->with('success', __('approval.medication_requested'));
    }
}
