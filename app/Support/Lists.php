<?php

namespace App\Support;

use App\Models\ListOption;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * The centre's editable "fixed lists". This is the single source of truth for
 * both backend validation and the frontend forms, so the two can never drift.
 *
 * Every list has a hardcoded DEFAULT (the values the system shipped with), and
 * the database can override/extend it. If the table is empty or unavailable the
 * defaults still apply — so the app never breaks on a fresh or unavailable DB.
 */
class Lists
{
    /** group => [key => label] */
    public const DEFAULTS = [
        'class' => [
            '5tahun' => '5 Tahun',
            '6bintang' => '6 Bintang',
        ],
        'gender' => [
            'male' => 'Male',
            'female' => 'Female',
        ],
        'nationality' => [
            'malaysian' => 'Malaysian',
            'non_malaysian' => 'Non-Malaysian',
        ],
        'student_status' => [
            'active' => 'Active',
            'withdrawn' => 'Withdrawn',
            'graduated' => 'Graduated',
        ],
        'blood_type' => [
            'A+' => 'A+', 'A-' => 'A-', 'B+' => 'B+', 'B-' => 'B-',
            'AB+' => 'AB+', 'AB-' => 'AB-', 'O+' => 'O+', 'O-' => 'O-',
        ],
        'immunisation_status' => [
            'complete' => 'Complete',
            'partial' => 'Partial',
            'none' => 'None',
            'exempt' => 'Exempt',
            'unknown' => 'Unknown',
        ],
        'guardian_relationship' => [
            'mother' => 'Mother',
            'father' => 'Father',
            'guardian' => 'Legal guardian',
            'grandparent' => 'Grandparent',
            'sibling' => 'Sibling',
            'uncle' => 'Uncle',
            'aunt' => 'Aunt',
            'other' => 'Other',
        ],
        'absence_type' => [
            'sick' => 'Sick',
            'personal' => 'Personal',
            'other' => 'Other',
        ],
        'absence_status' => [
            'pending' => 'Pending',
            'approved' => 'Approved',
            'declined' => 'Declined',
        ],
        'medication_status' => [
            'pending' => 'Pending',
            'given' => 'Given',
            'declined' => 'Not given',
        ],
        'memo_audience' => [
            'all' => 'Everyone',
            'parents' => 'Parents',
            'teachers' => 'Teachers',
            'class' => 'A class',
        ],
        'sleep_status' => [
            'Good' => 'Good',
            'Poor' => 'Poor',
        ],
        'bath_status' => [
            'Done' => 'Done',
            'Not Done' => 'Not Done',
        ],
        'progress_grade' => [
            'Good' => 'Good',
            'Average' => 'Average',
            'Poor' => 'Poor',
        ],
    ];

    /** Groups the admin can edit on the Lists screen. */
    public const MANAGEABLE = [
        'class',
        'gender',
        'nationality',
        'student_status',
        'blood_type',
        'immunisation_status',
        'guardian_relationship',
        'absence_type',
        'absence_status',
        'medication_status',
        'memo_audience',
        'sleep_status',
        'bath_status',
        'progress_grade',
    ];

    /** All options for a group, as [key => label]. */
    public static function options(string $group): array
    {
        $rows = static::rows($group);

        if ($rows->isEmpty()) {
            return static::DEFAULTS[$group] ?? [];
        }

        return $rows->pluck('label', 'key')->all();
    }

    /** Just the valid keys for validation rules. */
    public static function keys(string $group): array
    {
        $keys = array_keys(static::options($group));

        return $keys ?: array_keys(static::DEFAULTS[$group] ?? []);
    }

    /** The values as the frontend expects: [{value, label}]. */
    public static function payload(string $group): array
    {
        return collect(static::options($group))
            ->map(fn (string $label, string $key) => ['value' => $key, 'label' => $label])
            ->values()
            ->all();
    }

    /** Every manageable group at once, for Inertia shared props. */
    public static function all(): array
    {
        $out = [];

        foreach (static::MANAGEABLE as $group) {
            $out[$group] = static::payload($group);
        }

        return $out;
    }

    /** The label for a single key, falling back to the raw key. */
    public static function label(string $group, ?string $key): ?string
    {
        if ($key === null) {
            return null;
        }

        return static::options($group)[$key] ?? $key;
    }

    /**
     * Active rows from the database (cached briefly — these change rarely and
     * are read on most page loads).
     *
     * @return Collection<int, ListOption>
     */
    private static function rows(string $group): Collection
    {
        try {
            return Cache::remember("lists.{$group}", 300, fn () => ListOption::query()
                ->where('group', $group)
                ->where('is_active', true)
                ->orderBy('sort')
                ->orderBy('label')
                ->get());
        } catch (\Throwable) {
            // A missing table (e.g. before migrating) must never break the app.
            return collect();
        }
    }

    /** Clear the cache after any admin edit. */
    public static function forget(?string $group = null): void
    {
        if ($group) {
            Cache::forget("lists.{$group}");

            return;
        }

        foreach (static::MANAGEABLE as $g) {
            Cache::forget("lists.{$g}");
        }
    }
}
