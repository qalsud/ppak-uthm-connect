<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Centre;
use App\Support\ActiveCentre;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Centre CRUD plus the "active centre" switcher used across the admin portal.
 */
class CentreController extends Controller
{
    public function index(): Response
    {
        $centres = Centre::query()
            ->withCount(['students', 'users'])
            ->orderBy('sort')
            ->orderBy('name')
            ->get()
            ->map(fn (Centre $c) => [
                ...$c->summary(),
                'sort' => $c->sort,
                'address' => $c->address,
                'phone' => $c->phone,
                'email' => $c->email,
                'students_count' => $c->students_count,
                'users_count' => $c->users_count,
            ])
            ->values();

        return Inertia::render('Admin/Centres', [
            'centres' => $centres,
            'activeId' => ActiveCentre::id(),
        ]);
    }

    /** Switch the active centre (null = all centres). */
    public function switch(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'centre_id' => ['nullable', 'integer', Rule::exists('centres', 'id')],
        ]);

        ActiveCentre::set($data['centre_id'] ?? null);

        return back();
    }

    public function store(Request $request): RedirectResponse
    {
        $centre = Centre::create($this->validated($request));

        ActivityLog::record('centre.created', null, $centre->name);

        return back()->with('success', __('approval.centre_saved'));
    }

    public function update(Request $request, Centre $centre): RedirectResponse
    {
        $centre->update($this->validated($request, $centre));

        ActivityLog::record('centre.updated', null, $centre->name);

        return back()->with('success', __('approval.updated'));
    }

    /**
     * Centres are never deleted — records belong to them. Deactivating hides a
     * centre from the switcher without orphaning anything.
     */
    public function destroy(Centre $centre): RedirectResponse
    {
        $centre->update(['is_active' => false]);

        if (ActiveCentre::id() === $centre->id) {
            ActiveCentre::set(null);
        }

        ActivityLog::record('centre.deactivated', null, $centre->name);

        return back()->with('success', __('approval.centre_deactivated'));
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?Centre $centre = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'short_name' => ['nullable', 'string', 'max:60'],
            'code' => [
                'required', 'string', 'max:30', 'alpha_dash',
                Rule::unique('centres', 'code')->ignore($centre?->id),
            ],
            'address' => ['nullable', 'string', 'max:1000'],
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:255'],
            'sort' => ['nullable', 'integer', 'min:0'],
        ]);

        $data['sort'] = (int) ($data['sort'] ?? 0);

        return $data;
    }
}
