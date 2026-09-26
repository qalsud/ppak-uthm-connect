<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ParentController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->query('status');
        $search = trim((string) $request->query('search', ''));

        $parents = User::query()
            ->where('role', UserRole::Parent)
            ->when(
                in_array($status, AccountStatus::values(), true),
                fn ($q) => $q->where('status', $status)
            )
            ->when($search !== '', fn ($q) => $q->where(function ($w) use ($search) {
                $w->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            }))
            ->withCount('students')
            ->with('students:id,parent_id,name,class')
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        $counts = User::query()
            ->where('role', UserRole::Parent)
            ->get(['status'])
            ->groupBy('status')
            ->map->count();

        return Inertia::render('Admin/Parents', [
            'parents' => $parents,
            'counts' => [
                'all' => User::query()->where('role', UserRole::Parent)->count(),
                ...AccountStatus::valuesMap(fn ($s) => $counts->get($s, 0)),
            ],
            'filters' => ['status' => $status ?? '', 'search' => $search],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'ic_number' => 'nullable|string|max:20',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:8',
        ]);

        $parent = User::create([
            ...$data,
            'role' => UserRole::Parent,
            'status' => AccountStatus::Active,
            'email_verified_at' => now(),
        ]);

        ActivityLog::record('parent.created', $parent, $parent->name);

        return back()->with('success', __('approval.parent_created'));
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        abort_if($user->role !== UserRole::Parent, 422);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'ic_number' => 'nullable|string|max:20',
            'phone' => 'nullable|string|max:20',
            'status' => ['required', Rule::enum(AccountStatus::class)],
            'password' => 'nullable|string|min:8',
        ]);

        if (empty($data['password'])) {
            unset($data['password']);
        }

        $user->update($data);

        ActivityLog::record('parent.updated', $user, $user->name);

        return back()->with('success', __('approval.updated'));
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        abort_if($user->role !== UserRole::Parent, 422);

        // Students are kept; their parent link is cleared by the FK (nullOnDelete).
        ActivityLog::record('parent.deleted', null, $user->name);

        $user->delete();

        return back()->with('success', __('approval.deleted'));
    }

    public function export()
    {
        $parents = User::query()
            ->where('role', UserRole::Parent)
            ->withCount('students')
            ->orderBy('name')
            ->get();

        return response()->streamDownload(function () use ($parents) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Name', 'IC', 'Phone', 'Email', 'Status', 'Children']);

            foreach ($parents as $parent) {
                fputcsv($out, [
                    $parent->name,
                    $parent->ic_number ?? '',
                    $parent->phone ?? '',
                    $parent->email,
                    $parent->status->value,
                    $parent->students_count,
                ]);
            }

            fclose($out);
        }, 'parents.csv', ['Content-Type' => 'text/csv']);
    }
}
