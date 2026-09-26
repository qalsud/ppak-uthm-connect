<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Memo;
use App\Models\Student;
use App\Models\User;
use App\Notifications\MemoPostedNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class MemoController extends Controller
{
    public function index(): Response
    {
        $memos = Memo::query()
            ->with('author:id,name')
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Admin/Memos', [
            'memos' => $memos,
            'classes' => Student::CLASSES,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        $memo = Memo::create([
            ...$data,
            'author_id' => $request->user()->id,
        ]);

        Notification::send($this->recipients($memo), new MemoPostedNotification($memo));

        ActivityLog::record('memo.created', $memo, $memo->title, ['audience' => $memo->audience]);

        return back()->with('success', __('approval.memo_created'));
    }

    public function update(Request $request, Memo $memo): RedirectResponse
    {
        $memo->update($this->validated($request));

        ActivityLog::record('memo.updated', $memo, $memo->title, ['audience' => $memo->audience]);

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
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'audience' => ['nullable', Rule::in(Memo::AUDIENCES)],
            'class' => ['nullable', Rule::in(Student::CLASSES)],
        ]);

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

    /** @return Collection<int, User> */
    private function recipients(Memo $memo): Collection
    {
        $active = User::query()->where('status', AccountStatus::Active);

        return match ($memo->audience) {
            'parents' => (clone $active)->where('role', UserRole::Parent)->get(),
            'teachers' => (clone $active)->where('role', UserRole::Teacher)->get(),
            'class' => (clone $active)
                ->whereIn('role', [UserRole::Parent, UserRole::Teacher])
                ->where(function ($q) use ($memo) {
                    $q->where('role', UserRole::Teacher)
                        ->orWhereHas('students', fn ($s) => $s->where('class', $memo->class));
                })
                ->get(),
            default => (clone $active)->whereIn('role', [UserRole::Parent, UserRole::Teacher])->get(),
        };
    }
}
