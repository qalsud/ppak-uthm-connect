<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Attendance;
use App\Models\AttendancePhoto;
use App\Models\Conversation;
use App\Models\Student;
use App\Notifications\CheckInRecordedNotification;
use App\Notifications\CheckoutRecordedNotification;
use App\Services\Images\ImageStore;
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
    public function index(Request $request): Response
    {
        $assigned = $request->user()->assignedClass();

        $class = $assigned ?? (in_array($request->query('class'), Student::CLASSES, true)
            ? $request->query('class')
            : Student::CLASSES[0]);

        $date = $this->resolveDate($request->query('date'));

        $students = Student::query()
            ->active()
            ->where('class', $class)
            ->orderBy('name')
            ->get(['id', 'name', 'class']);

        $records = Attendance::onDateFor($students->pluck('id'), $date);

        $students->each(function (Student $student) use ($records) {
            $student->attendance = $records->get($student->id)?->summary() ?? Attendance::emptySummary();
        });

        return Inertia::render('Teacher/Attendance', [
            'students' => $students,
            'selectedClass' => $class,
            'assignedClass' => $assigned,
            'date' => $date,
            'isToday' => $date === today()->toDateString(),
            'counts' => [
                'school' => $students->filter(fn ($s) => $s->attendance['status'] === 'school')->count(),
                'home' => $students->filter(fn ($s) => $s->attendance['status'] === 'home')->count(),
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
            'date' => ['nullable', 'date', 'before_or_equal:today'],
        ]);

        $attendance = Attendance::firstOrNew([
            'student_id' => $student->id,
            'date' => $data['date'] ?? today()->toDateString(),
        ]);

        $wasArrived = (bool) $attendance->arrived_at;

        $attendance->markArrival($request->user()->id);
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
        ]);

        if ($skip && ! $hasPhoto && blank($request->input('override_reason'))) {
            throw ValidationException::withMessages([
                'override_reason' => __('override_reason_required'),
            ]);
        }

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

        $this->postCheckoutMessage($attendance, $student, $photo, $userId);

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

    /** Drop a short message (with the photo) into the parent ↔ teacher chat. */
    private function postCheckoutMessage(Attendance $attendance, Student $student, ?AttendancePhoto $photo, int $userId): void
    {
        $conversation = Conversation::firstOrCreate(
            ['student_id' => $student->id],
            ['teacher_id' => $userId],
        );

        if ($conversation->teacher_id === null) {
            $conversation->update(['teacher_id' => $userId]);
        }

        $conversation->messages()->create([
            'sender_id' => $userId,
            'body' => __('approval.checkout_message', [
                'name' => $student->name,
                'time' => $attendance->departed_at?->format('H:i') ?? now()->format('H:i'),
            ]),
            'attendance_photo_id' => $photo?->id,
        ]);

        $conversation->touch();
    }

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

        return $parsed > today()->toDateString() ? today()->toDateString() : $parsed;
    }
}
