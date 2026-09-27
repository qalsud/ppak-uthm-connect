<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\Memo;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class SearchController extends Controller
{
    /** Role-aware quick search used by the header search box. */
    public function __invoke(Request $request): JsonResponse
    {
        $query = trim((string) $request->query('q', ''));

        if (mb_strlen($query) < 2) {
            return response()->json(['groups' => []]);
        }

        $user = $request->user();
        $like = "%{$query}%";
        $groups = [];

        if ($user->isAdmin()) {
            $groups[] = $this->group(__('students'), Student::query()
                ->where('name', 'like', $like)
                ->orderBy('name')->limit(5)->get()
                ->map(fn (Student $s) => [
                    'label' => $s->name,
                    'sub' => $s->class_label,
                    'href' => route('admin.students.show', $s, absolute: false),
                ]));

            $groups[] = $this->group(__('teachers'), User::query()
                ->where('role', UserRole::Teacher)->where('name', 'like', $like)
                ->orderBy('name')->limit(5)->get()
                ->map(fn (User $u) => ['label' => $u->name, 'sub' => $u->email, 'href' => '/admin/teachers']));

            $groups[] = $this->group(__('parents'), User::query()
                ->where('role', UserRole::Parent)->where('name', 'like', $like)
                ->orderBy('name')->limit(5)->get()
                ->map(fn (User $u) => ['label' => $u->name, 'sub' => $u->email, 'href' => '/admin/parents']));
        }

        if ($user->isTeacher()) {
            $groups[] = $this->group(__('students'), Student::query()
                ->active()
                ->when($user->assignedClass(), fn ($q) => $q->where('class', $user->assignedClass()))
                ->where('name', 'like', $like)
                ->orderBy('name')->limit(5)->get()
                ->map(fn (Student $s) => [
                    'label' => $s->name,
                    'sub' => $s->class_label,
                    'href' => '/teacher/attendance',
                ]));
        }

        if ($user->isParent()) {
            $groups[] = $this->group(__('children'), $user->students()
                ->active()
                ->where('name', 'like', $like)
                ->orderBy('name')->limit(5)->get()
                ->map(fn (Student $s) => [
                    'label' => $s->name,
                    'sub' => $s->class_label,
                    'href' => route('parent.children.show', $s, absolute: false),
                ]));
        }

        $memoHref = $user->isAdmin() ? '/admin/memos' : ($user->isTeacher() ? '/teacher/memos' : '/parent/memos');

        $groups[] = $this->group(__('memos'), Memo::query()
            ->where('title', 'like', $like)
            ->orderByDesc('created_at')->limit(5)->get()
            ->map(fn (Memo $m) => ['label' => $m->title, 'sub' => __('memo'), 'href' => $memoHref]));

        return response()->json([
            'groups' => array_values(array_filter($groups, fn ($g) => count($g['items']) > 0)),
        ]);
    }

    /** @param  Collection<int, array<string, string>>  $items */
    private function group(string $label, $items): array
    {
        return ['label' => $label, 'items' => $items->values()->all()];
    }
}
