<?php

namespace App\Http\Controllers\Parent;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\AbsenceRequest;
use App\Models\Student;
use App\Models\User;
use App\Notifications\AbsenceRequestedNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AbsenceController extends Controller
{
    /** A parent reports that their child will be away. */
    public function store(Request $request, Student $student): RedirectResponse
    {
        abort_unless($student->parent_id === $request->user()->id, 403);

        $data = $request->validate([
            'start_date' => [
                'required', 'date',
                'after_or_equal:'.today()->subDays(7)->toDateString(),
                'before_or_equal:'.today()->addDays(90)->toDateString(),
            ],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'type' => ['required', Rule::in(AbsenceRequest::TYPES)],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $start = $request->date('start_date');
        $end = $request->date('end_date');

        if ($start && $end && $start->diffInDays($end) > AbsenceRequest::MAX_DAYS) {
            throw ValidationException::withMessages([
                'end_date' => __('absence_range_too_long', ['days' => AbsenceRequest::MAX_DAYS]),
            ]);
        }

        // Don't stack overlapping live requests for the same child.
        $overlaps = $student->absenceRequests()
            ->whereIn('status', ['pending', 'approved'])
            ->where('start_date', '<=', $end?->toDateString())
            ->where('end_date', '>=', $start?->toDateString())
            ->exists();

        if ($overlaps) {
            throw ValidationException::withMessages([
                'start_date' => __('absence_overlap'),
            ]);
        }

        $absence = $student->absenceRequests()->create([
            ...$data,
            'requested_by' => $request->user()->id,
            'status' => 'pending',
        ]);

        $teachers = User::query()
            ->where('role', UserRole::Teacher)
            ->where('status', AccountStatus::Active)
            ->get();

        if ($teachers->isNotEmpty()) {
            Notification::send($teachers, new AbsenceRequestedNotification($absence->load('student')));
        }

        return back()->with('success', __('approval.absence_submitted'));
    }

    /** A parent withdraws their own still-pending request. */
    public function destroy(Request $request, AbsenceRequest $absence): RedirectResponse
    {
        abort_unless($absence->student?->parent_id === $request->user()->id, 403);
        abort_unless($absence->isPending(), 403);

        $absence->delete();

        return back()->with('success', __('approval.absence_cancelled'));
    }
}
