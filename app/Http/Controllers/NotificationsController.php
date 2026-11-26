<?php

namespace App\Http\Controllers;

use App\Notifications\BaseNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Inertia;
use Inertia\Response;

class NotificationsController extends Controller
{
    private const PAGE_SIZE = 20;

    private const BELL_LIMIT = 6;

    /**
     * Full notification centre. The bell keeps using the JSON shape when it
     * asks with `Accept: application/json`, so existing clients keep working.
     */
    public function index(Request $request): Response|JsonResponse
    {
        if ($request->wantsJson()) {
            return $this->feed($request);
        }

        $user = $request->user();
        $category = $request->query('category');
        $unread = $request->boolean('unread');

        if (! in_array($category, BaseNotification::CATEGORIES, true)) {
            $category = null;
        }

        $notifications = $user->notifications()
            ->when($unread, fn ($query) => $query->whereNull('read_at'))
            ->when($category, fn ($query) => $query->where('data->category', $category))
            ->latest()
            ->paginate(self::PAGE_SIZE)
            ->withQueryString()
            ->through(fn (DatabaseNotification $notification) => $this->item($notification));

        return Inertia::render('Notifications', [
            'notifications' => $notifications,
            'filters' => [
                'category' => $category,
                'unread' => $unread,
            ],
            'categories' => collect(BaseNotification::CATEGORIES)
                ->map(fn (string $value) => [
                    'value' => $value,
                    'unread' => $user->unreadNotifications()
                        ->where('data->category', $value)
                        ->count(),
                ])
                ->all(),
            'unreadCount' => $user->unreadNotifications()->count(),
        ]);
    }

    /** The bell's compact feed. */
    public function feed(Request $request): JsonResponse
    {
        $user = $request->user();

        $notifications = $user->notifications()
            ->latest()
            ->limit(self::BELL_LIMIT)
            ->get(['id', 'data', 'read_at', 'created_at']);

        return response()->json([
            'count' => $user->unreadNotifications()->count(),
            'data' => $notifications,
        ]);
    }

    /** Mark one notification as read. */
    public function read(Request $request, string $notification): JsonResponse
    {
        $item = $this->find($request, $notification);
        $item->markAsRead();

        return response()->json([
            'count' => $request->user()->unreadNotifications()->count(),
            'read_at' => $item->read_at,
        ]);
    }

    /** Mark one notification as unread again. */
    public function unread(Request $request, string $notification): JsonResponse
    {
        $item = $this->find($request, $notification);
        $item->update(['read_at' => null]);

        return response()->json([
            'count' => $request->user()->unreadNotifications()->count(),
            'read_at' => null,
        ]);
    }

    public function readAll(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json(['count' => 0]);
    }

    public function destroy(Request $request, string $notification): JsonResponse
    {
        $this->find($request, $notification)->delete();

        return response()->json([
            'count' => $request->user()->unreadNotifications()->count(),
        ]);
    }

    private function find(Request $request, string $notification): DatabaseNotification
    {
        return $request->user()->notifications()->whereKey($notification)->firstOrFail();
    }

    /** @return array<string, mixed> */
    private function item(DatabaseNotification $notification): array
    {
        return [
            'id' => $notification->id,
            'data' => $notification->data,
            'read_at' => $notification->read_at,
            'created_at' => $notification->created_at,
        ];
    }
}
