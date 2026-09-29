<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Message;
use App\Models\ProgressPhoto;
use App\Models\ProgressRecord;
use App\Models\Student;
use App\Notifications\ProgressRecordedNotification;
use App\Services\Images\ImageStore;
use App\Services\Messaging\ConversationService;
use App\Support\Lists;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class ProgressController extends Controller
{
    public function __construct(private ConversationService $chat) {}

    public function index(Request $request): Response
    {
        $assigned = $request->user()->assignedClass();

        $students = Student::query()
            ->active()
            ->when($assigned, fn ($q) => $q->where('class', $assigned))
            ->orderBy('name')
            ->get(['id', 'name', 'class']);

        $studentId = $request->query('student');
        $class = $request->query('class');

        $query = ProgressRecord::query()->with([
            'student:id,name,class',
            'teacher:id,name',
            'photos.uploadedBy:id,name',
        ]);

        if ($studentId) {
            $query->where('student_id', $studentId);
        }

        if (in_array($class, Student::CLASSES, true)) {
            $query->whereHas('student', fn ($q) => $q->where('class', $class));
        }

        $records = $query->orderByDesc('date')->limit(60)->get();

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

        return Inertia::render('Teacher/Progress', [
            'shell' => $request->user()->shell(),
            'students' => $students,
            'records' => $records,
            'summary' => $summary,
            'assignedClass' => $assigned,
            'permata' => ProgressRecord::PERMATA,
            'free' => ProgressRecord::FREE,
            'development' => ProgressRecord::DEVELOPMENT,
            'grades' => ProgressRecord::GRADES,
            'filters' => [
                'student' => $studentId ? (string) $studentId : '',
                'class' => $class ?? '',
            ],
        ]);
    }

    public function store(Request $request, ImageStore $images): RedirectResponse
    {
        $validated = $request->validate([
            'student_id' => 'required|exists:students,id',
            'date' => 'required|date|before_or_equal:today',
            'sub_theme' => 'nullable|string|max:255',
            'activity_done' => ['required', Rule::in(Lists::keys('progress_grade'))],
            'child_proficiency' => ['required', Rule::in(Lists::keys('progress_grade'))],
            'permata_activity' => ['required', Rule::in(ProgressRecord::PERMATA)],
            'free_activity' => ['required', Rule::in(ProgressRecord::FREE)],
            'development_proficiency' => ['required', Rule::in(ProgressRecord::DEVELOPMENT)],
            'notes' => 'nullable|string|max:1000',
            'photo' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:'.(int) config('media.max_upload_kb'),
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
}
