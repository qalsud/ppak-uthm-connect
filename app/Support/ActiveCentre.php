<?php

namespace App\Support;

use App\Models\Centre;

/**
 * The "active centre" an admin is currently working in.
 *
 * Stored in the session so it survives navigation, and exposed to every Inertia
 * page so the switcher and any centre-aware filter can read it. `null` means
 * "All centres" (the default).
 */
class ActiveCentre
{
    public const SESSION_KEY = 'active_centre_id';

    public static function id(): ?int
    {
        $id = session(self::SESSION_KEY);

        return $id ? (int) $id : null;
    }

    public static function set(?int $centreId): void
    {
        if ($centreId === null) {
            session()->forget(self::SESSION_KEY);

            return;
        }

        session([self::SESSION_KEY => $centreId]);
    }

    public static function model(): ?Centre
    {
        $id = self::id();

        return $id ? Centre::find($id) : null;
    }

    /** Payload for the frontend switcher. */
    public static function payload(): array
    {
        return [
            'id' => self::id(),
            'options' => Centre::query()
                ->orderBy('sort')
                ->orderBy('name')
                ->get()
                ->map(fn (Centre $c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'short_name' => $c->short_name,
                    'is_active' => (bool) $c->is_active,
                ])
                ->values()
                ->all(),
        ];
    }
}
