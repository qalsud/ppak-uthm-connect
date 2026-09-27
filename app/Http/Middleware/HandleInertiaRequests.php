<?php

namespace App\Http\Middleware;

use App\Services\Messaging\ConversationService;
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
                'ms' => json_decode(
                    file_get_contents(lang_path('ms.json')),
                    true
                ),
                'en' => json_decode(
                    file_get_contents(lang_path('en.json')),
                    true
                ),
            ],
            'auth' => [
                'user' => $user,
            ],
            'unreadMessages' => $unreadMessages,
            'flash' => [
                'success' => session('success'),
                'error' => session('error'),
                'import_report' => session('import_report'),
            ],
        ];
    }
}
