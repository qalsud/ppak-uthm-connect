<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

/**
 * The admin-editable settings registry.
 *
 * `definitions()` is the single source of truth for the `/admin/settings`
 * screen (types, bounds, groups) *and* for resolving a value: `Settings::get()`
 * reads the DB, falls back to the definition's default (which, for media, is
 * the `config('media.*')` value so `.env` still works). Call sites use the
 * `setting('key', $fallback)` helper.
 */
class Settings
{
    /**
     * group => [key => [type, default, min?, max?]].
     *
     * @return array<string, array<string, array<string, mixed>>>
     */
    public static function definitions(): array
    {
        return [
            'fees' => [
                'fees.due_day' => ['type' => 'int', 'default' => 7, 'min' => 1, 'max' => 28],
            ],
            'operations' => [
                'operations.absence_max_days' => ['type' => 'int', 'default' => 31, 'min' => 1, 'max' => 365],
                'operations.fee_reminder_lead_days' => ['type' => 'int', 'default' => 3, 'min' => 0, 'max' => 60],
                'operations.message_edit_minutes' => ['type' => 'int', 'default' => 15, 'min' => 0, 'max' => 1440],
                'operations.message_max_length' => ['type' => 'int', 'default' => 2000, 'min' => 100, 'max' => 10000],
                'operations.message_attachment_limit' => ['type' => 'int', 'default' => 3, 'min' => 0, 'max' => 10],
            ],
            'media' => [
                'media.checkout_photo_required' => ['type' => 'bool', 'default' => (bool) config('media.checkout_photo_required')],
                'media.retention_days' => ['type' => 'int', 'default' => (int) config('media.retention_days'), 'min' => 0, 'max' => 3650],
                'media.watermark_enabled' => ['type' => 'bool', 'default' => (bool) config('media.watermark_enabled')],
                'media.max_upload_kb' => ['type' => 'int', 'default' => (int) config('media.max_upload_kb'), 'min' => 100, 'max' => 51200],
                'media.target_kb' => ['type' => 'int', 'default' => (int) config('media.target_kb'), 'min' => 0, 'max' => 10240],
                'media.max_dimension' => ['type' => 'int', 'default' => (int) config('media.max_dimension'), 'min' => 200, 'max' => 8000],
            ],
        ];
    }

    /** All definitions flattened to key => definition. */
    public static function flat(): array
    {
        $out = [];

        foreach (static::definitions() as $group) {
            $out += $group;
        }

        return $out;
    }

    /** The shipped/default value for a key. */
    public static function default(string $key): mixed
    {
        return static::flat()[$key]['default'] ?? null;
    }

    /** The current value (DB override, else the default). */
    public static function get(string $key, mixed $default = null): mixed
    {
        $fallback = $default ?? static::default($key);
        $raw = static::raw();

        if (! array_key_exists($key, $raw) || $raw[$key] === null || $raw[$key] === '') {
            return $fallback;
        }

        return static::cast($key, (string) $raw[$key], $fallback);
    }

    /** Store a value, clearing the cache. */
    public static function put(string $key, mixed $value): void
    {
        Setting::updateOrCreate(['key' => $key], ['value' => static::serialize($value)]);

        static::forget();
    }

    public static function forget(): void
    {
        Cache::forget('settings.all');
    }

    /**
     * Every known setting with its current value, grouped — for the admin UI.
     *
     * @return array<int, array{group: string, settings: array<int, array<string, mixed>>}>
     */
    public static function groups(): array
    {
        $groups = [];

        foreach (static::definitions() as $group => $defs) {
            $settings = [];

            foreach ($defs as $key => $def) {
                $settings[] = [
                    'key' => $key,
                    'field' => substr($key, strlen($group) + 1),
                    'type' => $def['type'],
                    'min' => $def['min'] ?? null,
                    'max' => $def['max'] ?? null,
                    'default' => $def['default'],
                    'value' => static::get($key),
                ];
            }

            $groups[] = ['group' => $group, 'settings' => $settings];
        }

        return $groups;
    }

    /** @return array<string, string|null> */
    private static function raw(): array
    {
        try {
            return Cache::remember('settings.all', 300, fn () => Setting::query()->pluck('value', 'key')->all());
        } catch (\Throwable) {
            // A missing table (e.g. before migrating) must never break the app.
            return [];
        }
    }

    private static function cast(string $key, string $raw, mixed $fallback): mixed
    {
        return match (static::flat()[$key]['type'] ?? null) {
            'int' => (int) $raw,
            'bool' => in_array(strtolower($raw), ['1', 'true', 'yes', 'on'], true),
            'float' => (float) $raw,
            default => $raw,
        };
    }

    private static function serialize(mixed $value): string
    {
        if (is_bool($value)) {
            return $value ? '1' : '0';
        }

        return (string) $value;
    }
}
