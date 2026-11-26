<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Models\User;
use App\Notifications\BaseNotification;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
            // The effective default for categories the user has not saved yet.
            'notificationDefaults' => collect(BaseNotification::CATEGORIES)
                ->mapWithKeys(fn (string $category) => [
                    $category => in_array($category, BaseNotification::EMAIL_DEFAULT_CATEGORIES, true),
                ])
                ->all(),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $data = $request->validated();

        // Keep the legacy chat flag in sync for older code paths.
        if (array_key_exists('notification_preferences', $data)) {
            $data['notify_email_messages'] = (bool) ($data['notification_preferences']['messages'] ?? false);
        }

        $request->user()->fill($data);

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        // Never let the last active administrator delete themselves out.
        if ($user->isAdmin() && User::activeAdminCount() <= 1) {
            throw ValidationException::withMessages([
                'password' => __('approval.last_admin_guard'),
            ]);
        }

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
