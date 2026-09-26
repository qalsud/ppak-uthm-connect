<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RegistrationController extends Controller
{
    public function index(): Response
    {
        $pendingUsers = User::query()
            ->whereIn('role', [UserRole::Parent, UserRole::Teacher])
            ->where('status', AccountStatus::Pending)
            ->orderBy('created_at', 'desc')
            ->get(['id', 'name', 'email', 'phone', 'role', 'created_at']);

        return Inertia::render('Admin/Registrations', [
            'users' => $pendingUsers,
        ]);
    }

    public function approve(Request $request, User $user): RedirectResponse
    {
        abort_if($user->status !== AccountStatus::Pending, 422);
        abort_if(in_array($user->role, [UserRole::Parent, UserRole::Teacher], true) === false, 422);

        $user->update([
            'status' => AccountStatus::Active,
            'activation_token' => null,
        ]);

        // A teacher account also needs a verified email for our middleware chain.
        if ($user->email_verified_at === null) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        return back()->with('success', __('approval.approved', ['name' => $user->name]));
    }

    public function reject(Request $request, User $user): RedirectResponse
    {
        abort_if($user->status !== AccountStatus::Pending, 422);
        abort_if(in_array($user->role, [UserRole::Parent, UserRole::Teacher], true) === false, 422);

        $user->update([
            'status' => AccountStatus::Rejected,
            'activation_token' => null,
        ]);

        return back()->with('success', __('approval.rejected', ['name' => $user->name]));
    }
}
