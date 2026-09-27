<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use App\Notifications\AccountDecisionNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class RegistrationController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->query('status', 'pending');
        $role = $request->query('role', 'all');
        $search = trim((string) $request->query('search', ''));

        $base = User::query()->whereIn('role', [UserRole::Parent, UserRole::Teacher]);

        $users = (clone $base)
            ->when(
                in_array($status, AccountStatus::values(), true),
                fn ($q) => $q->where('status', $status)
            )
            ->when(
                in_array($role, [UserRole::Parent->value, UserRole::Teacher->value], true),
                fn ($q) => $q->where('role', $role)
            )
            ->when($search !== '', fn ($q) => $q->where(
                fn ($w) => $w->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
            ))
            ->orderBy('created_at', 'desc')
            ->paginate(20)
            ->withQueryString();

        $counts = [
            'all' => (clone $base)->count(),
            ...AccountStatus::valuesMap(
                fn ($value) => (clone $base)->where('status', $value)->count()
            ),
        ];

        return Inertia::render('Admin/Registrations', [
            'users' => $users,
            'counts' => $counts,
            'filters' => [
                'status' => $status,
                'role' => $role,
                'search' => $search,
            ],
        ]);
    }

    public function approve(Request $request, User $user): RedirectResponse
    {
        abort_if($user->status !== AccountStatus::Pending, 422);
        abort_if(in_array($user->role, [UserRole::Parent, UserRole::Teacher], true) === false, 422);

        $user->update([
            'status' => AccountStatus::Active,
            'activation_token' => null,
            'rejection_reason' => null,
        ]);

        // Teacher accounts also need a verified email for our middleware chain.
        if ($user->email_verified_at === null) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        ActivityLog::record('user.approved', $user, $user->name);
        $user->notify(new AccountDecisionNotification($user->name, true));

        return back()->with('success', __('approval.approved', ['name' => $user->name]));
    }

    public function reject(Request $request, User $user): RedirectResponse
    {
        abort_if($user->status !== AccountStatus::Pending, 422);
        abort_if(in_array($user->role, [UserRole::Parent, UserRole::Teacher], true) === false, 422);

        $reason = $request->validate([
            'reason' => ['nullable', 'string', 'max:255'],
        ])['reason'] ?? null;

        $user->update([
            'status' => AccountStatus::Rejected,
            'activation_token' => null,
            'rejection_reason' => $reason,
        ]);

        ActivityLog::record('user.rejected', $user, $user->name, ['reason' => $reason]);
        $user->notify(new AccountDecisionNotification($user->name, false, $reason));

        return back()->with('success', __('approval.rejected', ['name' => $user->name]));
    }

    /** Bulk approve/reject pending accounts. */
    public function bulk(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'action' => ['required', Rule::in(['approve', 'reject'])],
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:users,id'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $users = User::query()
            ->whereIn('id', $data['ids'])
            ->whereIn('role', [UserRole::Parent, UserRole::Teacher])
            ->where('status', AccountStatus::Pending)
            ->get();

        $approving = $data['action'] === 'approve';
        $reason = $data['reason'] ?? null;

        foreach ($users as $user) {
            $user->update([
                'status' => $approving ? AccountStatus::Active : AccountStatus::Rejected,
                'activation_token' => null,
                'rejection_reason' => $approving ? null : $reason,
            ]);

            if ($approving && $user->email_verified_at === null) {
                $user->forceFill(['email_verified_at' => now()])->save();
            }

            ActivityLog::record(
                $approving ? 'user.approved' : 'user.rejected',
                $user,
                $user->name,
                ['bulk' => true, 'reason' => $approving ? null : $reason]
            );

            $user->notify(new AccountDecisionNotification($user->name, $approving, $approving ? null : $reason));
        }

        return back()->with('success', __('approval.bulk_updated', ['count' => $users->count()]));
    }
}
