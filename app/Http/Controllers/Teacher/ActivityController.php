<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\DailyActivity;
use App\Models\Message;
use App\Models\Student;
use App\Models\User;
use App\Notifications\ActivityRecordedNotification;
use App\Services\Messaging\ConversationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ActivityController extends Controller
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

        $today = $request->input('date', today()->toDateString());

        $records = DailyActivity::query()
            ->where('teacher_id', $request->user()->id)
            ->with('student:id,name,class')
            ->orderBy('date', 'desc')
            ->limit(30)
            ->get();

        return Inertia::render('Teacher/Activities', [
            'shell' => $request->user()->shell(),
            'students' => $students,
            'today' => $today,
            'fields' => DailyActivity::FIELDS,
            'records' => $records,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'student_id' => 'required|exists:students,id',
            'date' => 'required|date|before_or_equal:today',
            'treatment_notes' => 'nullable|string|max:1000',
            'statuses' => ['required', 'array'],
            'statuses.*' => [Rule::in(['yes', 'no'])],
        ]);

        $data = [
            'student_id' => $validated['student_id'],
            'teacher_id' => $request->user()->id,
            'date' => $validated['date'],
            'treatment_notes' => $validated['treatment_notes'] ?? null,
        ];

        $student = Student::with('parent')->findOrFail($data['student_id']);
        abort_unless($request->user()->canManage($student), 403);

        foreach (array_keys(DailyActivity::FIELDS) as $field) {
            $data[$field] = $validated['statuses'][$field] ?? 'no';
        }

        $record = DailyActivity::query()
            ->where('student_id', $data['student_id'])
            ->whereDate('date', $validated['date'])
            ->first();

        $isNew = $record === null;

        if ($record) {
            $record->update($data);
        } else {
            $record = DailyActivity::create($data);
        }

        if ($student->parent) {
            Notification::send($student->parent, new ActivityRecordedNotification($student));
        }

        // First time this day's activity is recorded → drop a summary into the chat.
        if ($isNew) {
            $this->postActivityMessage($record, $student, $request->user());
        }

        return back()->with('success', __('approval.activity_saved'));
    }

    /** Post a summary of the day's activity into the parent ↔ teacher chat. */
    private function postActivityMessage(DailyActivity $activity, Student $student, User $sender): void
    {
        $done = collect(DailyActivity::FIELDS)
            ->filter(fn ($label, $field) => $activity->{$field} === 'yes')
            ->values();

        $body = __('approval.activity_message', [
            'name' => $student->name,
            'date' => $activity->date?->format('d/m/Y') ?? '',
            'summary' => $done->isNotEmpty() ? $done->implode(', ') : __('approval.activity_none'),
        ]);

        if ($activity->treatment_notes) {
            $body .= "\n".$activity->treatment_notes;
        }

        $this->chat->post(
            $this->chat->conversationFor($student),
            $sender,
            $body,
            [],
            Message::TYPE_SYSTEM,
            false,
        );
    }
}
