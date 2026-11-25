<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Centre;
use App\Models\Memo;
use App\Models\Student;
use App\Services\Memos\MemoService;
use App\Support\Lists;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class MemoController extends Controller
{
    public function __construct(private MemoService $memos) {}

    public function index(): Response
    {
        $memos = Memo::query()
            ->with(['author:id,name', 'centre:id,name,short_name', 'attachments'])
            ->forActiveCentre()
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Admin/Memos', [
            'memos' => $memos,
            'classes' => Student::classKeys(),
            'centres' => Centre::active()->orderBy('sort')->get(['id', 'name', 'short_name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->memos->create(
            $request->user(),
            $this->validated($request),
            $request->file('attachments') ?? [],
        );

        return back()->with('success', __('approval.memo_created'));
    }

    public function update(Request $request, Memo $memo): RedirectResponse
    {
        $this->memos->update(
            $memo,
            $request->user(),
            $this->validated($request),
            $request->file('attachments') ?? [],
            (array) $request->input('remove_attachments', []),
        );

        return back()->with('success', __('approval.updated'));
    }

    public function destroy(Request $request, Memo $memo): RedirectResponse
    {
        ActivityLog::record('memo.deleted', null, $memo->title);

        $memo->delete();

        return back()->with('success', __('approval.deleted'));
    }

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        $maxKb = (int) setting('media.max_upload_kb', config('media.max_upload_kb'));

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'audience' => ['nullable', Rule::in(Lists::keys('memo_audience'))],
            'class' => ['nullable', Rule::in(Student::classKeys())],
            'centre_id' => ['nullable', 'integer', Rule::exists('centres', 'id')],
            'attachments' => ['nullable', 'array', 'max:'.Memo::MAX_PHOTOS],
            'attachments.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:'.$maxKb],
            'remove_attachments' => ['nullable', 'array'],
            'remove_attachments.*' => ['integer'],
        ]);

        // Attachments are handled separately; only memo columns reach the model.
        unset($data['attachments'], $data['remove_attachments']);

        $data['audience'] ??= 'all';

        if ($data['audience'] === 'class' && empty($data['class'])) {
            throw ValidationException::withMessages([
                'class' => __('validation.required', ['attribute' => 'class']),
            ]);
        }

        if ($data['audience'] !== 'class') {
            $data['class'] = null;
        }

        return $data;
    }
}
