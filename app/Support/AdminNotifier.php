<?php

namespace App\Support;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Notification as NotificationFacade;

class AdminNotifier
{
    /** Send a notification to every admin account. */
    public static function send(Notification $notification): void
    {
        $admins = User::query()->where('role', UserRole::Admin)->get();

        if ($admins->isNotEmpty()) {
            NotificationFacade::send($admins, $notification);
        }
    }
}
