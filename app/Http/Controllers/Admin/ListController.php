<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AbsenceRequest;
use App\Models\ActivityLog;
use App\Models\DailyActivity;
use App\Models\Guardian;
use App\Models\ListOption;
use App\Models\MedicationRequest;
use App\Models\Memo;
use App\Models\ProgressRecord;
use App\Models\Student;
use App\Models\User;
use App\Support\Lists;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Lets an admin rename, reorder, deactivate, add or remove the options in any
 * of the centre's fixed lists (classes, blood types, relationships, …).
 *
 * The shipped defaults always remain as a fallback, so emptying a list never
 * breaks the app.
 */
class ListController extends Controller
{
    public function index(): Response
    {
        $groups = collect(Lists::MANAGEABLE)->map(function (string $group) {
            $rows = ListOption::query()
                ->where('group', $group)
                ->orderBy('sort')
                ->orderBy('label')
                ->get();

            // Has the admin customised this list, or is it still the default?
            $customised = $rows->isNotEmpty();

            $options = $customised
                ? $rows->map(fn (ListOption $r) => [
                    'id' => $r->id,
                    'value' => $r->key,
                    'label' => $r->label,
                    'sort' => $r->sort,
                    'is_active' => $r->is_active,
                    'in_use' => $this->inUse($group, $r->key),
                ])->values()
                : collect(Lists::options($group))->map(fn (string $label, string $key) => [
                    'id' => null,
                    'value' => $key,
                    'label' => $label,
                    'sort' => 0,
                    'is_active' => true,
                    'in_use' => $this->inUse($group, $key),
                ])->values();

            return [
                'group' => $group,
                'label' => $group,
                'customised' => $customised,
                'fixed' => in_array($group, Lists::FIXED_KEYS, true),
                'options' => $options,
            ];
        })->values();

        return Inertia::render('Admin/Lists', [
            'groups' => $groups,
        ]);
    }

    /** Add an option (creating the group's rows from defaults on first edit). */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'group' => ['required', Rule::in(Lists::MANAGEABLE)],
            'key' => ['required', 'string', 'max:60'],
            'label' => ['required', 'string', 'max:120'],
            'sort' => ['nullable', 'integer', 'min:0'],
        ]);

        // Some lists map to real columns — new keys can't be stored, so reject.
        if (in_array($data['group'], Lists::FIXED_KEYS, true)
            && ! array_key_exists($data['key'], Lists::DEFAULTS[$data['group']] ?? [])) {
            throw ValidationException::withMessages([
                'key' => __('approval.list_fixed_keys'),
            ]);
        }

        $this->seedDefaults($data['group']);

        ListOption::updateOrCreate(
            ['group' => $data['group'], 'key' => $data['key']],
            [
                'label' => $data['label'],
                'sort' => $data['sort'] ?? 0,
                'is_active' => true,
            ],
        );

        Lists::forget($data['group']);
        ActivityLog::record('list.created', null, $data['group'], ['key' => $data['key']]);

        return back()->with('success', __('approval.list_saved'));
    }

    public function update(Request $request, ListOption $option): RedirectResponse
    {
        $data = $request->validate([
            'label' => ['required', 'string', 'max:120'],
            'sort' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $option->update([
            'label' => $data['label'],
            'sort' => $data['sort'] ?? 0,
            'is_active' => (bool) ($data['is_active'] ?? true),
        ]);

        Lists::forget($option->group);
        ActivityLog::record('list.updated', null, $option->group, ['key' => $option->key]);

        return back()->with('success', __('approval.updated'));
    }

    public function destroy(ListOption $option): RedirectResponse
    {
        // Deactivate rather than delete anything already used by a record.
        if ($this->inUse($option->group, $option->key)) {
            $option->update(['is_active' => false]);
            Lists::forget($option->group);

            return back()->with('success', __('approval.list_deactivated'));
        }

        $group = $option->group;
        $option->delete();

        Lists::forget($group);
        ActivityLog::record('list.deleted', null, $group, ['key' => $option->key]);

        return back()->with('success', __('approval.deleted'));
    }

    /**
     * Copy the shipped defaults into the table the first time a group is
     * edited, so the admin sees (and can tweak) the whole list rather than an
     * empty one.
     */
    private function seedDefaults(string $group): void
    {
        if (ListOption::query()->where('group', $group)->exists()) {
            return;
        }

        foreach (Lists::DEFAULTS[$group] ?? [] as $key => $label) {
            ListOption::create([
                'group' => $group,
                'key' => $key,
                'label' => $label,
                'is_active' => true,
            ]);
        }
    }

    /** Whether any record currently uses this value. */
    private function inUse(string $group, string $key): bool
    {
        return match ($group) {
            'class' => Student::query()->where('class', $key)->exists()
                || User::query()->where('class', $key)->exists(),
            'student_status' => Student::query()->where('status', $key)->exists(),
            'gender' => Student::query()->where('gender', $key)->exists(),
            'nationality' => Student::query()->where('nationality', $key)->exists(),
            'blood_type' => Student::query()->where('blood_type', $key)->exists(),
            'immunisation_status' => Student::query()->where('immunisation_status', $key)->exists(),
            'guardian_relationship' => Guardian::query()->where('relationship', $key)->exists(),
            'absence_type' => AbsenceRequest::query()->where('type', $key)->exists(),
            'absence_status' => AbsenceRequest::query()->where('status', $key)->exists(),
            'medication_status' => MedicationRequest::query()->where('status', $key)->exists(),
            'memo_audience' => Memo::query()->where('audience', $key)->exists(),
            'progress_permata' => ProgressRecord::query()->where('permata_activity', $key)->exists(),
            'progress_free' => ProgressRecord::query()->where('free_activity', $key)->exists(),
            'progress_development' => ProgressRecord::query()->where('development_proficiency', $key)->exists(),
            // Activity fields are real columns, so any used column is "in use".
            'daily_activity_field' => array_key_exists($key, DailyActivity::FIELDS)
                && DailyActivity::query()->where($key, 'yes')->exists(),
            default => false,
        };
    }
}
