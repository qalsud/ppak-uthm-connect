<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Support\Settings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Lets an admin change the system's operational rules (fee due day, absence
 * window, message limits, photo retention, …). Values are read through
 * `setting('key', config('…'))`, so a missing row falls back to the shipped
 * default and nothing breaks.
 */
class SettingsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Settings', [
            'groups' => Settings::groups(),
            'scheduler' => $this->schedulerStatus(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $defs = Settings::flat();

        $rules = [];
        foreach ($defs as $key => $def) {
            $rules["settings.{$key}"] = match ($def['type']) {
                'bool' => ['nullable', 'boolean'],
                'int' => ['nullable', 'integer', 'min:'.($def['min'] ?? 0), 'max:'.($def['max'] ?? 1000000)],
                default => ['nullable', 'string', 'max:255'],
            };
        }

        // The form submits a nested tree (settings.fees.due_day) so Laravel's
        // dot validation and the "settings.<key>" error keys line up.
        $validated = $request->validate($rules);
        $input = $validated['settings'] ?? [];

        $changed = [];

        foreach ($defs as $key => $def) {
            if (! Arr::has($input, $key)) {
                continue;
            }

            $raw = Arr::get($input, $key);

            $value = match ($def['type']) {
                'bool' => (bool) $raw,
                'int' => (int) $raw,
                default => (string) $raw,
            };

            Settings::put($key, $value);
            $changed[$key] = $value;
        }

        ActivityLog::record('settings.updated', null, null, $changed);

        return back()->with('success', __('approval.settings_saved'));
    }

    /**
     * Whether the scheduled jobs have run recently — the clearest signal that
     * cron / the scheduler is actually working in production.
     */
    private function schedulerStatus(): array
    {
        $jobs = [
            'media_prune' => ['scheduler.media_prune_last_run', 'media:prune-photos'],
            'fee_reminders' => ['scheduler.fee_reminders_last_run', 'fees:send-reminders'],
        ];

        $out = [];

        foreach ($jobs as $name => [$key, $command]) {
            $last = setting($key);
            $lastAt = $last ? Carbon::parse($last) : null;

            $out[$name] = [
                'command' => $command,
                'last_run' => $lastAt?->toIso8601String(),
                'last_run_human' => $lastAt?->diffForHumans(),
                'stale' => $lastAt === null || $lastAt->lt(now()->subHours(25)),
            ];
        }

        return $out;
    }
}
