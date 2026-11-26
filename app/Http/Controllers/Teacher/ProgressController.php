<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Centre;
use App\Models\Message;
use App\Models\ProgressGroupActivity;
use App\Models\ProgressGroupPhoto;
use App\Models\ProgressPhoto;
use App\Models\ProgressRecord;
use App\Models\Student;
use App\Notifications\GroupActivityRecordedNotification;
use App\Notifications\ProgressRecordedNotification;
use App\Services\Images\ImageStore;
use App\Services\Messaging\ConversationService;
use App\Services\Reports\ProgressReport;
use App\Support\Lists;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class ProgressController extends Controller
{
    public function __construct(private ConversationService $chat) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $assigned = $user->assignedClass();

        $students = Student::query()
            ->active()
            ->visibleTo($user)
            ->orderBy('name')
            ->get(['id', 'name', 'class', 'centre_id']);

        $studentId = $request->query('student');
        $class = $request->query('class');

        $query = ProgressRecord::query()
            ->whereNull('group_activity_id')
            ->with([
                'student:id,name,class',
                'teacher:id,name',
                'photos.uploadedBy:id,name',
            ]);

        if ($studentId) {
            $query->where('student_id', $studentId);
        }

        if (in_array($class, Student::classKeys(), true)) {
            $query->whereHas('student', fn ($q) => $q->where('class', $class));
        }

        $records = $query->orderByDesc('date')->limit(60)->get();

        // Group activities are shown as their own cards; their per-child rows
        // stay in progress_records but are not repeated in the individual list.
        $visibleStudents = Student::query()
            ->visibleTo($user)
            ->select('id');

        $groupQuery = ProgressGroupActivity::query()
            ->with([
                'teacher:id,name',
                'records:id,group_activity_id,student_id,activity_done,child_proficiency',
                'records.student:id,name,class',
                'photos.uploadedBy:id,name',
            ])
            ->withCount('records')
            ->whereHas('records', fn ($q) => $q->whereIn('student_id', $visibleStudents));

        if ($studentId) {
            $groupQuery->whereHas('records', fn ($q) => $q->where('student_id', $studentId));
        }

        if (in_array($class, Student::classKeys(), true)) {
            $groupQuery->where('class', $class);
        }

        $groupActivities = $groupQuery->orderByDesc('date')->limit(30)->get();

        $summary = null;

        if ($studentId) {
            $latest = ProgressRecord::query()
                ->where('student_id', $studentId)
                ->orderByDesc('date')
                ->first();

            $summary = [
                'count' => ProgressRecord::query()->where('student_id', $studentId)->count(),
                'last_date' => $latest?->date?->format('Y-m-d'),
                'latest' => $latest ? [
                    'activity_performance' => $latest->activity_done,
                    'skill_mastery' => $latest->child_proficiency,
                    'development_area' => $latest->development_proficiency,
                ] : null,
            ];
        }

        $centres = $user->isAdmin() || $user->centreIds() === null
            ? Centre::active()->orderBy('sort')->get(['id', 'name', 'short_name'])
            : $user->centres()->orderBy('name')->get(['centres.id', 'name', 'short_name']);

        return Inertia::render('Teacher/Progress', [
            'shell' => $user->shell(),
            'students' => $students,
            'centres' => $centres,
            'records' => $records,
            'groupActivities' => $groupActivities,
            'summary' => $summary,
            'assignedClass' => $assigned,
            'filters' => [
                'student' => $studentId ? (string) $studentId : '',
                'class' => $class ?? '',
            ],
        ]);
    }

    public function destroy(Request $request, ProgressRecord $record): RedirectResponse
    {
        $student = Student::query()->findOrFail($record->student_id);

        abort_unless($request->user()->canManage($student), 403);

        $date = $record->date?->toDateString();

        $record->photos->each->delete();
        $record->delete();

        ActivityLog::record('progress.deleted', $student, $student->name, ['date' => $date]);

        return back()->with('success', __('approval.deleted'));
    }

    public function store(Request $request, ImageStore $images): RedirectResponse
    {
        $validated = $request->validate([
            'student_id' => 'required|exists:students,id',
            'date' => 'required|date|before_or_equal:today',
            'sub_theme' => 'nullable|string|max:255',
            'activity_done' => ['required', Rule::in(Lists::keys('progress_grade'))],
            'child_proficiency' => ['required', Rule::in(Lists::keys('progress_grade'))],
            'permata_activity' => ['required', Rule::in(Lists::keys('progress_permata'))],
            'free_activity' => ['required', Rule::in(Lists::keys('progress_free'))],
            'development_proficiency' => ['required', Rule::in(Lists::keys('progress_development'))],
            'notes' => 'nullable|string|max:1000',
            'photo' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:'.(int) setting('media.max_upload_kb', config('media.max_upload_kb')),
            ],
        ]);

        $photoFile = $request->file('photo');
        unset($validated['photo']);

        $validated['teacher_id'] = $request->user()->id;

        $student = Student::with('parent')->findOrFail($validated['student_id']);
        abort_unless($request->user()->canManage($student), 403);

        $record = ProgressRecord::query()
            ->where('student_id', $validated['student_id'])
            ->whereDate('date', $validated['date'])
            ->first();

        if ($record) {
            $record->update($validated);
        } else {
            $record = ProgressRecord::create($validated);
        }

        $photo = null;

        if ($photoFile && $student) {
            try {
                $stored = $images->store($photoFile, 'progress', [
                    'watermark' => [
                        'PPAK UTHM · '.__('progress'),
                        $student->name,
                        now()->format('d/m/Y H:i'),
                    ],
                ]);
            } catch (RuntimeException) {
                return back()->with('error', __('approval.photo_invalid'));
            }

            // Keep a single photo per progress record.
            $record->photos()->get()->each->delete();

            $photo = ProgressPhoto::create([
                'progress_record_id' => $record->id,
                'student_id' => $student->id,
                'disk' => $stored->disk,
                'path' => $stored->path,
                'thumb_path' => $stored->thumbPath,
                'original_name' => $photoFile->getClientOriginalName(),
                'mime' => $stored->mime,
                'size' => $stored->size,
                'width' => $stored->width,
                'height' => $stored->height,
                'note' => $record->sub_theme,
                'uploaded_by' => $request->user()->id,
            ]);
        }

        if ($student?->parent) {
            Notification::send($student->parent, new ProgressRecordedNotification($student));
        }

        if ($photo && $student) {
            $this->chat->post(
                $this->chat->conversationFor($student),
                $request->user(),
                __('approval.progress_message', [
                    'name' => $student->name,
                    'theme' => $record->sub_theme ?: __('progress'),
                ]),
                [],
                Message::TYPE_SYSTEM,
                false,
                ['progress_photo_id' => $photo->id],
            );
        }

        ActivityLog::record('progress.recorded', $record, $student?->name, [
            'photo' => $photo !== null,
        ]);

        return back()->with('success', __('approval.progress_saved'));
    }

    /** Which selected children already have a progress record on this date. */
    public function groupConflicts(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date' => ['required', 'date'],
            'student_ids' => ['required', 'array', 'min:1'],
            'student_ids.*' => ['integer'],
        ]);

        $students = Student::query()
            ->active()
            ->visibleTo($request->user())
            ->whereIn('id', $data['student_ids'])
            ->get(['id', 'name']);

        $existing = ProgressRecord::query()
            ->whereIn('student_id', $students->pluck('id'))
            ->whereDate('date', $data['date'])
            ->pluck('student_id')
            ->all();

        $conflicts = $students
            ->whereIn('id', $existing)
            ->values()
            ->map(fn (Student $student) => ['id' => $student->id, 'name' => $student->name]);

        return response()->json([
            'conflicts' => $conflicts,
            'count' => $conflicts->count(),
        ]);
    }

    /**
     * Record one shared activity for several children. Each child still gets
     * their own progress row (and their own ratings) so existing parent and
     * report screens keep working unchanged.
     */
    public function storeGroup(Request $request, ImageStore $images): RedirectResponse
    {
        $user = $request->user();
        $assigned = $user->assignedClass();

        $validated = $request->validate([
            'class' => ['required', Rule::in(Student::classKeys())],
            'centre_id' => ['required', 'integer', Rule::exists('centres', 'id')],
            'date' => ['required', 'date', 'before_or_equal:today'],
            'sub_theme' => ['nullable', 'string', 'max:255'],
            'permata_activity' => ['required', Rule::in(Lists::keys('progress_permata'))],
            'free_activity' => ['required', Rule::in(Lists::keys('progress_free'))],
            'development_proficiency' => ['required', Rule::in(Lists::keys('progress_development'))],
            'notes' => ['nullable', 'string', 'max:1000'],
            'participants' => ['required', 'array', 'min:1', 'max:100'],
            'participants.*.student_id' => ['required', 'integer', 'distinct'],
            'participants.*.activity_done' => ['required', Rule::in(Lists::keys('progress_grade'))],
            'participants.*.child_proficiency' => ['required', Rule::in(Lists::keys('progress_grade'))],
            'replace_existing' => ['sometimes', 'boolean'],
            'photo' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:'.(int) setting('media.max_upload_kb', config('media.max_upload_kb')),
            ],
        ]);

        if ($assigned !== null && $validated['class'] !== $assigned) {
            throw ValidationException::withMessages([
                'class' => __('validation.in', ['attribute' => 'class']),
            ]);
        }

        $studentIds = collect($validated['participants'])
            ->pluck('student_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $students = Student::query()
            ->active()
            ->visibleTo($user)
            ->whereIn('id', $studentIds)
            ->where('class', $validated['class'])
            ->where('centre_id', $validated['centre_id'])
            ->get()
            ->keyBy('id');

        if ($students->count() !== count($studentIds)) {
            throw ValidationException::withMessages([
                'participants' => __('progress.group_invalid_participants'),
            ]);
        }

        $replace = (bool) ($validated['replace_existing'] ?? false);

        [$group, $written, $skipped] = DB::transaction(function () use (
            $validated,
            $user,
            $students,
            $replace,
        ): array {
            $first = $validated['participants'][0];

            $group = ProgressGroupActivity::create([
                'teacher_id' => $user->id,
                'centre_id' => $validated['centre_id'],
                'class' => $validated['class'],
                'date' => $validated['date'],
                'sub_theme' => $validated['sub_theme'] ?? null,
                'activity_done' => $first['activity_done'],
                'child_proficiency' => $first['child_proficiency'],
                'permata_activity' => $validated['permata_activity'],
                'free_activity' => $validated['free_activity'],
                'development_proficiency' => $validated['development_proficiency'],
                'notes' => $validated['notes'] ?? null,
            ]);

            $written = [];
            $skipped = [];

            foreach ($validated['participants'] as $participant) {
                $student = $students[(int) $participant['student_id']];

                $existing = ProgressRecord::query()
                    ->where('student_id', $student->id)
                    ->whereDate('date', $validated['date'])
                    ->first();

                if ($existing && ! $replace) {
                    $skipped[] = $student->name;

                    continue;
                }

                $attributes = [
                    'teacher_id' => $user->id,
                    'group_activity_id' => $group->id,
                    'date' => $validated['date'],
                    'sub_theme' => $validated['sub_theme'] ?? null,
                    'activity_done' => $participant['activity_done'],
                    'child_proficiency' => $participant['child_proficiency'],
                    'permata_activity' => $validated['permata_activity'],
                    'free_activity' => $validated['free_activity'],
                    'development_proficiency' => $validated['development_proficiency'],
                    'notes' => $validated['notes'] ?? null,
                ];

                if ($existing) {
                    // Keep the child's existing photo; only the assessment and
                    // shared group details are replaced.
                    $existing->update($attributes);
                    $record = $existing;
                } else {
                    $record = ProgressRecord::create([
                        'student_id' => $student->id,
                        ...$attributes,
                    ]);
                }

                $written[] = [$student, $record];
            }

            if ($written === []) {
                throw ValidationException::withMessages([
                    'participants' => __('progress.group_all_conflict'),
                ]);
            }

            return [$group, $written, $skipped];
        });

        $photo = null;
        $photoFailed = false;
        $photoFile = $request->file('photo');

        if ($photoFile) {
            try {
                $stored = $images->store($photoFile, 'progress', [
                    'watermark' => [
                        'PPAK UTHM - '.__('progress'),
                        Student::classLabelStatic($group->class),
                        $group->date?->format('d/m/Y') ?? '',
                    ],
                ]);
            } catch (RuntimeException) {
                $stored = null;
                $photoFailed = true;
            }

            if ($stored) {
                $photo = ProgressGroupPhoto::create([
                    'group_activity_id' => $group->id,
                    'disk' => $stored->disk,
                    'path' => $stored->path,
                    'thumb_path' => $stored->thumbPath,
                    'original_name' => $photoFile->getClientOriginalName(),
                    'mime' => $stored->mime,
                    'size' => $stored->size,
                    'width' => $stored->width,
                    'height' => $stored->height,
                    'note' => $group->sub_theme,
                    'uploaded_by' => $user->id,
                ]);
            }
        }

        foreach ($written as [$student]) {
            if ($student->parent) {
                Notification::send(
                    $student->parent,
                    new GroupActivityRecordedNotification($student, $group),
                );
            }
        }

        ActivityLog::record('progress.group_created', $group, $group->sub_theme, [
            'class' => $group->class,
            'centre_id' => $group->centre_id,
            'participants' => count($written),
            'skipped' => count($skipped),
            'photo' => $photo !== null,
        ]);

        $message = $skipped === []
            ? __('approval.group_saved', ['count' => count($written)])
            : __('approval.group_saved_skipped', [
                'count' => count($written),
                'skipped' => count($skipped),
            ]);

        $response = back()->with('success', $message);

        if ($photoFailed) {
            $response->with('error', __('approval.photo_invalid'));
        }

        return $response;
    }

    /** Remove a group from history; each child's progress row is preserved. */
    public function destroyGroup(Request $request, ProgressGroupActivity $group): RedirectResponse
    {
        $user = $request->user();

        $canDelete = $user->isAdmin()
            || Student::query()
                ->whereIn('id', $group->records()->select('student_id'))
                ->get()
                ->contains(fn (Student $student) => $user->canManage($student));

        abort_unless($canDelete, 403);

        ActivityLog::record('progress.group_deleted', $group, $group->sub_theme, [
            'class' => $group->class,
            'participants' => $group->records()->count(),
        ]);

        $group->delete();

        return back()->with('success', __('approval.deleted'));
    }

    /** Per-child progress report PDF (the teacher's class, or admin oversight). */
    public function report(Request $request, Student $student, ProgressReport $report)
    {
        abort_unless($request->user()->canManage($student), 403);

        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $data = $report->data($student, $validated['from'] ?? null, $validated['to'] ?? null);

        return $report->pdf($data)->download('laporan-perkembangan-'.$student->id.'.pdf');
    }
}
