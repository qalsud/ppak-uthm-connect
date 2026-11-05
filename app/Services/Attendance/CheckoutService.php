<?php

namespace App\Services\Attendance;

use App\Models\ActivityLog;
use App\Models\Attendance;
use App\Models\AttendancePhoto;
use App\Models\Message;
use App\Models\Student;
use App\Notifications\CheckoutRecordedNotification;
use App\Services\Images\ImageStore;
use App\Services\Messaging\ConversationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;

/**
 * The checkout flow: validate the collector, record the departure, store the
 * proof photo, post to the parent chat and notify the family.
 */
class CheckoutService
{
    public function __construct(private ConversationService $chat) {}

    public function handle(Request $request, Student $student, ImageStore $images): ?AttendancePhoto
    {
        $required = (bool) setting('media.checkout_photo_required', config('media.checkout_photo_required'));
        $skip = $request->boolean('skip_photo');
        $hasPhoto = $request->hasFile('photo');

        $request->validate([
            'photo' => [
                $required && ! $skip ? 'required' : 'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:'.(int) setting('media.max_upload_kb', config('media.max_upload_kb')),
            ],
            'note' => ['nullable', 'string', 'max:255'],
            'date' => ['nullable', 'date', 'before_or_equal:today'],
            'skip_photo' => ['nullable', 'boolean'],
            'override_reason' => ['nullable', 'string', 'max:255'],
            'collected_by' => ['nullable', 'string', 'max:60'],
            'collector_override' => ['nullable', 'string', 'max:255'],
        ]);

        if ($skip && ! $hasPhoto && blank($request->input('override_reason'))) {
            throw ValidationException::withMessages([
                'override_reason' => __('override_reason_required'),
            ]);
        }

        // Safeguarding: whoever collects the child must be on the authorised
        // list, otherwise the release needs a recorded reason.
        $student->loadMissing(['guardians', 'authorisedCollectors']);
        $options = collect($student->collectorOptions());
        $allowed = $options->pluck('id')->all();
        $collectedBy = $request->input('collected_by');
        $collectorOverride = $request->input('collector_override');

        if ($collectedBy && ! in_array($collectedBy, $allowed, true) && blank($collectorOverride)) {
            throw ValidationException::withMessages([
                'collector_override' => __('collector_not_authorised'),
            ]);
        }

        if (blank($collectedBy) && blank($collectorOverride)) {
            throw ValidationException::withMessages([
                'collected_by' => __('collector_required'),
            ]);
        }

        // Store the human-readable name, with the relationship for context
        // (e.g. "Nor Aisyah binti Omar (Mother)") — never the raw option id.
        $chosen = $options->firstWhere('id', $collectedBy);
        $collectedByLabel = $chosen
            ? trim($chosen['name'].($chosen['relationship'] ? ' ('.__('relationship.'.$chosen['relationship']).')' : ''))
            : null;

        $userId = $request->user()->id;

        $attendance = Attendance::firstOrNew([
            'student_id' => $student->id,
            'date' => $request->input('date') ?? today()->toDateString(),
        ]);

        // Ensure the child is recorded as having arrived first.
        if (! $attendance->arrived_at) {
            $attendance->markArrival($userId);
        }

        $attendance->markDeparture($userId);
        $attendance->checkout_note = $request->input('note');
        $attendance->checkout_photo_override = ! $hasPhoto;
        $attendance->checkout_override_reason = $hasPhoto ? null : $request->input('override_reason');
        $attendance->collected_by = $collectorOverride ?: $collectedByLabel;
        $attendance->collector_override_reason = $collectorOverride;
        $attendance->save();

        $photo = null;

        if ($hasPhoto) {
            $stored = $images->store($request->file('photo'), 'checkout', [
                'watermark' => [
                    'PPAK UTHM · '.__('checkout_title'),
                    $student->name,
                    now()->format('d/m/Y H:i'),
                ],
            ]);

            $photo = AttendancePhoto::create([
                'attendance_id' => $attendance->id,
                'student_id' => $student->id,
                'type' => 'checkout',
                'disk' => $stored->disk,
                'path' => $stored->path,
                'thumb_path' => $stored->thumbPath,
                'original_name' => $request->file('photo')->getClientOriginalName(),
                'mime' => $stored->mime,
                'size' => $stored->size,
                'width' => $stored->width,
                'height' => $stored->height,
                'note' => $request->input('note'),
                'uploaded_by' => $userId,
            ]);
        }

        $this->chat->post(
            $this->chat->conversationFor($student),
            $request->user(),
            __('approval.checkout_message', [
                'name' => $student->name,
                'time' => $attendance->departed_at?->format('H:i') ?? now()->format('H:i'),
            ]),
            [],
            Message::TYPE_SYSTEM,
            false,
            ['attendance_photo_id' => $photo?->id],
        );

        ActivityLog::record('attendance.checkout', $student, $student->name, [
            'photo' => $photo !== null,
            'override' => $attendance->checkout_photo_override,
        ]);

        if ($student->parent) {
            Notification::send(
                $student->parent,
                new CheckoutRecordedNotification($student, $attendance, $photo !== null)
            );
        }

        return $photo;
    }
}
