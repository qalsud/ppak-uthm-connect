<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\AbsenceRequest;
use App\Models\ActivityLog;
use App\Models\Attendance;
use App\Models\AttendancePhoto;
use App\Models\MedicationRequest;
use App\Models\Message;
use App\Models\Student;
use App\Notifications\CheckInRecordedNotification;
use App\Notifications\CheckoutRecordedNotification;
use App\Services\Images\ImageStore;
use App\Services\Messaging\ConversationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class AttendanceController extends Controller
{
    public function __construct(private ConversationService $chat) {}

    public function index(Request $request): Response
    {
        $assigned = $request->user()->assignedClass();

        $requested = in_array($request->query('class'), Student::CLASSES, true)
            ? $request->query('class')
            : null;

        // Prefer the explicit choice, then the teacher's class, then the first
        // class that actually has children (never a hardcoded 5tahun, which can
        // leave an unassigned teacher staring at an empty register).
        $class = $assigned
            ?? $requested
            ?? Student::query()
                ->active()
                ->orderBy('class')
                ->value('class')
            ?? Student::CLASSES[0];

        $date = $this->resolveDate($request->query('date'));

        $students = Student::query()
            ->active()
            ->where('class', $class)
            ->orderBy('name')
            ->get(['id', 'name', 'class', 'allergies', 'has_special_needs', 'dietary_restrictions', 'medical_notes']);

        $records = Attendance::onDateFor($students->pluck('id'), $date);

        $medications = MedicationRequest::query()
            ->whereIn('student_id', $students->pluck('id'))
            ->whereDate('date', $date)
            ->with(['student:id,name', 'givenBy:id,name'])
            ->orderBy('time_due')
            ->get()
            ->sortBy(fn (MedicationRequest $m) => [$m->status === 'pending' ? 0 : 1, $m->time_due ?? ''])
            ->map(fn (MedicationRequest $m) => $m->summary())
            ->values();

        // Absences covering this register day.
        $absenceRequests = AbsenceRequest::query()
            ->whereIn('student_id', $students->pluck('id'))
            ->whereIn('status', ['pending', 'approved'])
            ->where('start_date', '<=', $date)
            ->where('end_date', '>=', $date)
            ->with(['student:id,name', 'reviewedBy:id,name', 'attachments'])
            ->orderBy('start_date')
            ->get()
            ->map(fn (AbsenceRequest $a) => $a->summary())
            ->values();

        // Everything still to come (or awaiting review) for this class, so a
        // request can be actioned without hunting for the exact date it covers.
        $upcomingAbsences = AbsenceRequest::query()
            ->whereIn('student_id', $students->pluck('id'))
            ->whereIn('status', ['pending', 'approved'])
            ->where('end_date', '>=', today()->toDateString())
            ->with(['student:id,name', 'reviewedBy:id,name', 'attachments'])
            ->orderBy('start_date')
            ->limit(25)
            ->get()
            ->map(fn (AbsenceRequest $a) => $a->summary())
            ->values();

        $students->each(function (Student $student) use ($records) {
            $student->attendance = $records->get($student->id)?->summary() ?? Attendance::emptySummary();
            $student->setAttribute('alerts', $student->alerts());
        });

        // Authorised collectors per child, for the checkout verification step.
        $students->loadMissing(['guardians', 'authorisedCollectors']);
        $students->each(function (Student $student) {
            $student->setAttribute('collectors', $student->collectorOptions());
        });

        return Inertia::render('Teacher/Attendance', [
            'shell' => $request->user()->shell(),
            'students' => $students,
            'selectedClass' => $class,
            'assignedClass' => $assigned,
            'date' => $date,
            'isToday' => $date === today()->toDateString(),
            'medications' => $medications,
            'absenceRequests' => $absenceRequests,
            'upcomingAbsences' => $upcomingAbsences,
            // The cards sit above the summary, so give them their own counts.
            'absenceCounts' => [
                'pending' => $upcomingAbsences->where('status', 'pending')->count(),
                'approved' => $upcomingAbsences->where('status', 'approved')->count(),
            ],
            'counts' => [
                'school' => $students->filter(fn ($s) => $s->attendance['status'] === 'school')->count(),
                'home' => $students->filter(fn ($s) => $s->attendance['status'] === 'home')->count(),
                'absent' => $students->filter(fn ($s) => $s->attendance['status'] === 'absent')->count(),
                'none' => $students->filter(fn ($s) => $s->attendance['status'] === 'none')->count(),
            ],
        ]);
    }

    /** Mark a child as arrived (no photo required). */
    public function store(Request $request, Student $student): RedirectResponse
    {
        abort_unless($request->user()->canManage($student), 403);

        $data = $request->validate([
            'action' => ['required', Rule::in(['arrive'])],
            // Teachers may correct an upcoming absence day (e.g. the child turns
            // up), so allow the same forward window as the absence form.
            'date' => ['nullable', 'date', 'before_or_equal:'.today()->addDays(90)->toDateString()],
            'temperature' => ['nullable', 'numeric', 'between:30,45'],
            'health_note' => ['nullable', 'string', 'max:255'],
        ]);

        $attendance = Attendance::firstOrNew([
            'student_id' => $student->id,
            'date' => $data['date'] ?? today()->toDateString(),
        ]);

        $wasArrived = (bool) $attendance->arrived_at;

        $attendance->markArrival($request->user()->id);

        if (! empty($data['temperature'])) {
            $attendance->temperature = $data['temperature'];
        }

        if (! empty($data['health_note'])) {
            $attendance->health_note = $data['health_note'];
        }

        // The child is here, so any approved-absence flag for this day is cleared.
        $attendance->absence_request_id = null;
        $attendance->absence_type = null;

        $attendance->save();

        if (! $wasArrived && $student->parent) {
            Notification::send($student->parent, new CheckInRecordedNotification($student, $attendance));
        }

        return back()->with('success', __('approval.attendance_saved'));
    }

    /** Mark every student in the class as present for the day. */
    public function markAll(Request $request): RedirectResponse
    {
        $assigned = $request->user()->assignedClass();

        $data = $request->validate([
            'class' => ['nullable', Rule::in(Student::CLASSES)],
            'date' => ['nullable', 'date', 'before_or_equal:today'],
        ]);

        $class = $assigned ?? ($data['class'] ?? Student::CLASSES[0]);
        $date = $data['date'] ?? today()->toDateString();

        $students = Student::query()->active()->where('class', $class)->with('parent')->get();
        $existing = Attendance::onDateFor($students->pluck('id'), $date);

        $marked = 0;

        foreach ($students as $student) {
            $attendance = $existing->get($student->id)
                ?? new Attendance(['student_id' => $student->id, 'date' => $date]);

            // Skip children already present or already gone home.
            if ($attendance->arrived_at || $attendance->departed_at) {
                continue;
            }

            $attendance->markArrival($request->user()->id);
            $attendance->save();
            $marked++;

            if ($student->parent) {
                Notification::send($student->parent, new CheckInRecordedNotification($student, $attendance));
            }
        }

        ActivityLog::record('attendance.mark_all', null, $class, ['date' => $date, 'marked' => $marked]);

        return back()->with('success', __('approval.marked_present', ['count' => $marked]));
    }

    /** Check a child out — requires a photo (or a documented override). */
    public function checkout(Request $request, Student $student, ImageStore $images): RedirectResponse
    {
        abort_unless($request->user()->canManage($student), 403);

        $required = (bool) config('media.checkout_photo_required');
        $skip = $request->boolean('skip_photo');
        $hasPhoto = $request->hasFile('photo');

        $request->validate([
            'photo' => [
                $required && ! $skip ? 'required' : 'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:'.(int) config('media.max_upload_kb'),
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
            try {
                $stored = $images->store($request->file('photo'), 'checkout', [
                    'watermark' => [
                        'PPAK UTHM · '.__('checkout_title'),
                        $student->name,
                        now()->format('d/m/Y H:i'),
                    ],
                ]);
            } catch (RuntimeException) {
                return back()->with('error', __('approval.photo_invalid'));
            }

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

        return back()->with(
            'success',
            $photo
                ? __('approval.checked_out')
                : __('approval.checked_out_override')
        );
    }

    /**
     * Resolve the register day. Past days stay selectable; future days are
     * allowed up to the absence window so approved absences can be reviewed
     * (and corrected) ahead of time.
     */
    private function resolveDate(?string $date): string
    {
        if (! $date) {
            return today()->toDateString();
        }

        try {
            $parsed = Carbon::parse($date)->toDateString();
        } catch (\Throwable) {
            return today()->toDateString();
        }

        $latest = today()->addDays(90)->toDateString();

        return $parsed > $latest ? $latest : $parsed;
    }
}
