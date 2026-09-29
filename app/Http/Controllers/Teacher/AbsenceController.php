<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\AbsenceRequest;
use App\Models\ActivityLog;
use App\Models\Message;
use App\Notifications\AbsenceReviewedNotification;
use App\Services\Messaging\ConversationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;

class AbsenceController extends Controller
{
    public function __construct(private ConversationService $chat) {}

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

        // Reflect the decision in the child's chat thread.
        $student = $absence->student;

        if ($student) {
            $key = $data['status'] === 'approved'
                ? 'approval.absence_approved_chat'
                : 'approval.absence_declined_chat';

            $this->chat->post(
                $this->chat->conversationFor($student),
                $request->user(),
                __($key, [
                    'name' => $student->name,
                    'from' => $absence->start_date?->format('d/m/Y'),
                    'to' => $absence->end_date?->format('d/m/Y'),
                ]),
                [],
                Message::TYPE_SYSTEM,
                false,
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
