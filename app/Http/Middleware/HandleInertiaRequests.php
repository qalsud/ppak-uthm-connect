<?php

namespace App\Http\Middleware;

use App\Services\Messaging\ConversationService;
use App\Support\ActiveCentre;
use App\Support\Lists;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        $unreadMessages = 0;
        if ($user && ($user->isParent() || $user->isTeacher())) {
            $unreadMessages = app(ConversationService::class)->unreadCountFor($user);
        }

        return [
            ...parent::share($request),
            'locale' => app()->getLocale(),
            'translations' => [
                // Only the active locale: sharing both dictionaries doubles the
                // initial Inertia payload (~75 KB) on every page visit.
                app()->getLocale() => json_decode(
                    file_get_contents(lang_path(app()->getLocale().'.json')),
                    true
                ),
            ],
            'auth' => [
                'user' => $user,
            ],
            // Admin-editable lists — the one source of truth for form options,
            // so frontend constants can never drift from backend validation.
            'lists' => $user ? Lists::all() : [],
            // The admin's currently-selected centre (null = all centres).
            'activeCentre' => $user?->isAdmin() ? ActiveCentre::payload() : null,
            'unreadMessages' => $unreadMessages,
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
                'import_report' => session('import_report'),
            ],
        ];
    }
}
