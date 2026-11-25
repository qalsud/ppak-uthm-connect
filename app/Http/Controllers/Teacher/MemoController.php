<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Memo;
use App\Services\Memos\MemoService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class MemoController extends Controller
{
    public function __construct(private MemoService $memos) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        $memos = Memo::query()
            ->with(['author:id,name', 'attachments'])
            // Visibility lives in one place (Memo::visibleTo) so the memo list
            // and the dashboard badge can never disagree.
            ->visibleTo($user)
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Teacher/Memos', [
            'memos' => $memos,
            'canPublish' => $user->assignedClass() !== null,
            'assignedClass' => $user->assignedClass(),
            'centres' => $user->centres()->orderBy('name')->get(['centres.id', 'name']),
        ]);
    }

    /**
     * Publish a memo to the teacher's own class. The audience, class and centre
     * are decided server-side so a teacher cannot target another class.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $class = $user->assignedClass();

        if ($class === null) {
            throw ValidationException::withMessages([
                'title' => __('teacher_class_required'),
            ]);
        }

        $maxKb = (int) setting('media.max_upload_kb', config('media.max_upload_kb'));

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'centre_id' => ['nullable', 'integer', Rule::exists('centres', 'id')],
            'attachments' => ['nullable', 'array', 'max:'.Memo::MAX_PHOTOS],
            'attachments.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:'.$maxKb],
        ]);

        $centreId = $this->resolveCentreId($user->centreIds(), $data['centre_id'] ?? null);

        $this->memos->create($user, [
            'title' => $data['title'],
            'description' => $data['description'],
            'audience' => 'class',
            'class' => $class,
            'centre_id' => $centreId,
        ], $request->file('attachments') ?? []);

        return back()->with('success', __('approval.memo_created'));
    }

    /**
     * @param  array<int, int>|null  $allowed  Null means unrestricted (legacy account).
     */
    private function resolveCentreId(?array $allowed, ?int $requested): ?int
    {
        if ($allowed === null) {
            return $requested;
        }

        if ($requested === null) {
            if (count($allowed) === 1) {
                return $allowed[0];
            }

            throw ValidationException::withMessages([
                'centre_id' => __('validation.required', ['attribute' => 'centre']),
            ]);
        }

        if (! in_array($requested, $allowed, true)) {
            throw ValidationException::withMessages([
                'centre_id' => __('validation.exists', ['attribute' => 'centre']),
            ]);
        }

        return $requested;
    }
}
