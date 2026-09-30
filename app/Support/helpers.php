<?php

use App\Support\Settings;

if (! function_exists('setting')) {
    /**
     * Read an admin-editable setting, falling back to the given default (or the
     * definition's default) when nothing is stored. Safe before migration.
     */
    function setting(string $key, mixed $default = null): mixed
    {
        return Settings::get($key, $default);
    }
}
