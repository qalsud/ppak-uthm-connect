<?php

namespace App\Http\Controllers\Parent;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\AbsenceAttachment;
use App\Models\AbsenceRequest;
use App\Models\Message;
use App\Models\Student;
use App\Models\User;
use App\Notifications\AbsenceRequestedNotification;
use App\Services\Files\DocumentStore;
use App\Services\Messaging\ConversationService;
use App\Support\Lists;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class AbsenceController extends Controller
{
    public function __construct(private ConversationService $chat) {}

    /** A parent reports that their child will be away. */
    public function store(Request $request, Student $student, DocumentStore $documents): RedirectResponse
    {
        abort_unless($student->parent_id === $request->user()->id, 403);

        $data = $request->validate([
            'start_date' => [
                'required', 'date',
                'after_or_equal:'.today()->subDays(7)->toDateString(),
                'before_or_equal:'.today()->addDays(90)->toDateString(),
            ],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'type' => ['required', Rule::in(Lists::keys('absence_type'))],
            'reason' => ['nullable', 'string', 'max:1000'],
            // Optional proof (medical certificate scan, photo or PDF).
            'document' => [
                'nullable',
                'file',
                'mimetypes:image/jpeg,image/png,image/webp,application/pdf',
                'max:'.(int) config('media.document_max_upload_kb'),
            ],
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

        $this->storeDocument($request, $documents, $absence);

        $teachers = User::query()
            ->where('role', UserRole::Teacher)
            ->where('status', AccountStatus::Active)
            ->get();

        if ($teachers->isNotEmpty()) {
            Notification::send($teachers, new AbsenceRequestedNotification($absence->load('student')));
        }

        $this->postToChat($absence, $request->user());

        return back()->with('success', __('approval.absence_submitted'));
    }

    /** Attach an optional proof document to an existing pending request. */
    public function attach(Request $request, AbsenceRequest $absence, DocumentStore $documents): RedirectResponse
    {
        abort_unless($absence->student?->parent_id === $request->user()->id, 403);
        abort_unless($absence->isPending(), 403);

        $request->validate([
            'document' => [
                'required',
                'file',
                'mimetypes:image/jpeg,image/png,image/webp,application/pdf',
                'max:'.(int) config('media.document_max_upload_kb'),
            ],
        ]);

        $this->storeDocument($request, $documents, $absence);

        return back()->with('success', __('approval.absence_document_added'));
    }

    /** Post the absence into the child's chat thread as a system message. */
    private function postToChat(AbsenceRequest $absence, User $parent): void
    {
        $student = $absence->student;

        if (! $student) {
            return;
        }

        $this->chat->post(
            $this->chat->conversationFor($student),
            $parent,
            __('approval.absence_chat_message', [
                'name' => $student->name,
                'from' => $absence->start_date?->format('d/m/Y'),
                'to' => $absence->end_date?->format('d/m/Y'),
                'type' => __('absence.'.$absence->type),
            ]),
            [],
            Message::TYPE_SYSTEM,
            false,
        );
    }

    /** Store the optional document that arrived with a request/attach call. */
    private function storeDocument(Request $request, DocumentStore $documents, AbsenceRequest $absence): void
    {
        $file = $request->file('document');

        if (! $file) {
            return;
        }

        try {
            $stored = $documents->store($file, 'absence-documents', [
                'watermark' => [
                    'PPAK UTHM · '.__('absence'),
                    $absence->student?->name ?? '',
                    now()->format('d/m/Y H:i'),
                ],
            ]);
        } catch (RuntimeException) {
            return;
        }

        AbsenceAttachment::create([
            'absence_request_id' => $absence->id,
            'student_id' => $absence->student_id,
            'disk' => $stored['disk'],
            'path' => $stored['path'],
            'thumb_path' => $stored['thumb_path'],
            'original_name' => $file->getClientOriginalName(),
            'mime' => $stored['mime'],
            'size' => $stored['size'],
            'uploaded_by' => $request->user()->id,
        ]);
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
