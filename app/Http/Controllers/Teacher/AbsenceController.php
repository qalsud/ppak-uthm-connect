<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\AbsenceRequest;
use App\Models\ActivityLog;
use App\Notifications\AbsenceReviewedNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;

class AbsenceController extends Controller
{
    /** Approve or decline a parent's absence request. */
    public function update(Request $request, AbsenceRequest $absence): RedirectResponse
    {
        abort_unless($request->user()->canManage($absence->student), 403);

        $data = $request->validate([
            'status' => ['required', Rule::in(['approved', 'declined'])],
            'review_note' => ['nullable', 'string', 'max:255'],
        ]);

        $absence->update([
            'status' => $data['status'],
            'review_note' => $data['review_note'] ?? null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        // Mark (or clear) the covered attendance days.
        $absence->syncAttendance();

        ActivityLog::record('absence.'.$data['status'], $absence->student, $absence->student?->name, [
            'from' => $absence->start_date?->format('Y-m-d'),
            'to' => $absence->end_date?->format('Y-m-d'),
            'type' => $absence->type,
        ]);

        if ($absence->student?->parent) {
            Notification::send(
                $absence->student->parent,
                new AbsenceReviewedNotification($absence->load('student'))
            );
        }

        return back()->with(
            'success',
            $data['status'] === 'approved'
                ? __('approval.absence_approved')
                : __('approval.absence_declined')
        );
    }
}
