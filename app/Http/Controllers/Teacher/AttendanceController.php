<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\AbsenceRequest;
use App\Models\ActivityLog;
use App\Models\Attendance;
use App\Models\MedicationRequest;
use App\Models\Student;
use App\Notifications\CheckInRecordedNotification;
use App\Services\Attendance\CheckoutService;
use App\Services\Images\ImageStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class AttendanceController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $assigned = $user->assignedClass();

        $requested = in_array($request->query('class'), Student::classKeys(), true)
            ? $request->query('class')
            : null;

        // Prefer the explicit choice, then the teacher's class, then the first
        // class that actually has children *within their centre scope* — never
        // a hardcoded class, which may belong to another centre.
        $class = $assigned
            ?? $requested
            ?? Student::defaultClassFor($user);

        $date = $this->resolveDate($request->query('date'));

        $students = Student::query()
            ->active()
            ->visibleTo($user)
            ->inClass($class)
            ->orderBy('name')
            ->get(['id', 'name', 'class', 'centre_id', 'allergies', 'has_special_needs', 'dietary_restrictions', 'medical_notes']);

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
            'class' => ['nullable', Rule::in(Student::classKeys())],
            'date' => ['nullable', 'date', 'before_or_equal:today'],
        ]);

        $class = $assigned
            ?? ($data['class'] ?? Student::defaultClassFor($request->user()));
        $date = $data['date'] ?? today()->toDateString();

        $students = Student::query()
            ->active()
            ->visibleTo($request->user())
            ->inClass($class)
            ->with('parent')
            ->get();
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
    public function checkout(
        Request $request,
        Student $student,
        ImageStore $images,
        CheckoutService $checkout,
    ): RedirectResponse {
        abort_unless($request->user()->canManage($student), 403);

        try {
            $photo = $checkout->handle($request, $student, $images);
        } catch (RuntimeException) {
            return back()->with('error', __('approval.photo_invalid'));
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
