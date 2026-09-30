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
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Manage administrator accounts (previously seeder-only). Guards against the
 * two footguns: deleting yourself, and removing the last active admin.
 */
class AdministratorController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->query('status');
        $search = trim((string) $request->query('search', ''));

        $admins = User::query()
            ->where('role', UserRole::Admin)
            ->when(in_array($status, AccountStatus::values(), true), fn ($q) => $q->where('status', $status))
            ->when($search !== '', fn ($q) => $q->where(function ($w) use ($search) {
                $w->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            }))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        $counts = User::query()
            ->where('role', UserRole::Admin)
            ->get(['status'])
            ->groupBy('status')
            ->map->count();

        return Inertia::render('Admin/Administrators', [
            'admins' => $admins,
            'counts' => [
                'all' => User::query()->where('role', UserRole::Admin)->count(),
                ...AccountStatus::valuesMap(fn ($s) => $counts->get($s, 0)),
            ],
            'activeAdmins' => User::activeAdminCount(),
            'filters' => ['status' => $status ?? '', 'search' => $search],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8',
        ]);

        $admin = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => UserRole::Admin,
            'status' => AccountStatus::Active,
            'email_verified_at' => now(),
        ]);

        ActivityLog::record('admin.created', $admin, $admin->name);

        return back()->with('success', __('approval.admin_created'));
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        abort_if($user->role !== UserRole::Admin, 422);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'status' => ['required', Rule::enum(AccountStatus::class)],
            'password' => 'nullable|string|min:8',
        ]);

        // Deactivating the last active admin would lock everyone out.
        if ($data['status'] !== AccountStatus::Active->value
            && $user->isActive()
            && User::activeAdminCount() <= 1) {
            throw ValidationException::withMessages([
                'status' => __('approval.last_admin_guard'),
            ]);
        }

        if (empty($data['password'])) {
            unset($data['password']);
        }

        $user->update($data);

        ActivityLog::record('admin.updated', $user, $user->name, ['status' => $data['status']]);

        return back()->with('success', __('approval.updated'));
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        abort_if($user->role !== UserRole::Admin, 422);

        // Deleting your own admin account goes through the profile page.
        if ($user->id === $request->user()->id) {
            throw ValidationException::withMessages([
                'admin' => __('approval.admin_self_guard'),
            ]);
        }

        if ($user->isActive() && User::activeAdminCount() <= 1) {
            throw ValidationException::withMessages([
                'admin' => __('approval.last_admin_guard'),
            ]);
        }

        ActivityLog::record('admin.deleted', null, $user->name);

        $user->delete();

        return back()->with('success', __('approval.deleted'));
    }
}
