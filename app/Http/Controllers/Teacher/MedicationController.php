<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\MedicationRequest;
use App\Notifications\MedicationAdministeredNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;

class MedicationController extends Controller
{
    /** Record a medication as given (or declined) by staff. */
    public function update(Request $request, MedicationRequest $medication): RedirectResponse
    {
        abort_unless($request->user()->canManage($medication->student), 403);

        $data = $request->validate([
            'status' => ['required', Rule::in(['given', 'declined'])],
            'administered_note' => ['nullable', 'string', 'max:255'],
        ]);

        $given = $data['status'] === 'given';

        $medication->update([
            'status' => $data['status'],
            'administered_note' => $data['administered_note'] ?? null,
            'given_at' => $given ? now() : null,
            'given_by' => $request->user()->id,
        ]);

        ActivityLog::record('medication.'.$data['status'], $medication->student, $medication->student?->name, [
            'medicine' => $medication->medicine,
        ]);

        if ($given && $medication->student?->parent) {
            Notification::send(
                $medication->student->parent,
                new MedicationAdministeredNotification($medication->fresh(['student']))
            );
        }

        return back()->with(
            'success',
            $given ? __('approval.medication_given') : __('approval.medication_declined')
        );
    }
}
