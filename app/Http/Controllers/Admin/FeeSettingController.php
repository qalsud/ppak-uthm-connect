<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Centre;
use App\Models\FeeSetting;
use App\Support\ActiveCentre;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Editable, versioned fee rates — one shared/global rate plus optional
 * per-centre overrides (G-i5). Rates are never deleted, only deactivated, so
 * a paid record's history stays explainable.
 */
class FeeSettingController extends Controller
{
    public function index(): Response
    {
        $centres = Centre::active()
            ->orderBy('sort')
            ->orderBy('name')
            ->get(['id', 'name', 'short_name']);

        $feeSettings = FeeSetting::query()
            ->with('centre:id,name,short_name')
            ->orderByDesc('id')
            ->get()
            ->map(fn (FeeSetting $fee) => [
                'id' => $fee->id,
                'centre_id' => $fee->centre_id,
                'centre' => $fee->centre?->short_name ?? $fee->centre?->name,
                'monthly_fee' => (float) $fee->monthly_fee,
                'overtime_rate' => (float) $fee->overtime_rate,
                'is_active' => (bool) $fee->is_active,
                'updated_at' => $fee->updated_at?->toIso8601String(),
            ])
            ->values();

        return Inertia::render('Admin/Fees', [
            'feeSettings' => $feeSettings,
            'centres' => $centres,
            'activeCentreId' => ActiveCentre::id(),
            'current' => [
                'global' => $this->currentPayload(null),
                'perCentre' => $centres->mapWithKeys(fn (Centre $c) => [
                    (string) $c->id => $this->currentPayload($c->id),
                ]),
            ],
        ]);
    }

    /** Create a new active version for a scope, retiring the previous one. */
    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        DB::transaction(function () use ($data) {
            $this->deactivateScope($data['centre_id']);
            FeeSetting::create([...$data, 'is_active' => true]);
        });

        ActivityLog::record('fees.created', null, null, $data);

        return back()->with('success', __('approval.fee_created'));
    }

    /** Update the current rate for a scope (creating it if none exists). */
    public function update(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        // Target the scope's *own* active row — never the global row via fallback.
        $fee = FeeSetting::query()
            ->active()
            ->when(
                $data['centre_id'] === null,
                fn ($q) => $q->whereNull('centre_id'),
                fn ($q) => $q->where('centre_id', $data['centre_id']),
            )
            ->latest('id')
            ->first();

        if ($fee) {
            $fee->update([
                'monthly_fee' => $data['monthly_fee'],
                'overtime_rate' => $data['overtime_rate'],
            ]);
        } else {
            $fee = FeeSetting::create([...$data, 'is_active' => true]);
        }

        ActivityLog::record('fees.updated', $fee, null, $data);

        return back()->with('success', __('approval.fee_updated'));
    }

    /** Deactivate a version (never deleted — history is kept). */
    public function destroy(FeeSetting $fee): RedirectResponse
    {
        $fee->update(['is_active' => false]);

        ActivityLog::record('fees.deactivated', $fee, null, ['centre_id' => $fee->centre_id]);

        return back()->with('success', __('approval.fee_deactivated'));
    }

    /** @return array{centre_id: int|null, monthly_fee: mixed, overtime_rate: mixed} */
    private function validated(Request $request): array
    {
        $data = $request->validate([
            'centre_id' => ['nullable', 'integer', Rule::exists('centres', 'id')],
            'monthly_fee' => ['required', 'numeric', 'min:0', 'max:100000'],
            'overtime_rate' => ['required', 'numeric', 'min:0', 'max:100000'],
        ]);

        return [
            'centre_id' => $data['centre_id'] ?? null,
            'monthly_fee' => $data['monthly_fee'],
            'overtime_rate' => $data['overtime_rate'],
        ];
    }

    /**
     * The active rate for a scope, shaped for the form. For a centre with no
     * rate of its own, the shown values are the inherited global ones and
     * `inherited` is true (so the UI can say so and not imply an override).
     */
    private function currentPayload(?int $centreId): array
    {
        $own = $centreId === null
            ? FeeSetting::query()->active()->whereNull('centre_id')->latest('id')->first()
            : FeeSetting::query()->active()->where('centre_id', $centreId)->latest('id')->first();

        if ($own) {
            return [
                'id' => $own->id,
                'monthly_fee' => (float) $own->monthly_fee,
                'overtime_rate' => (float) $own->overtime_rate,
                'inherited' => false,
            ];
        }

        $fallback = FeeSetting::current(null);

        return [
            'id' => null,
            'monthly_fee' => (float) $fallback->monthly_fee,
            'overtime_rate' => (float) $fallback->overtime_rate,
            'inherited' => $centreId !== null,
        ];
    }

    private function deactivateScope(?int $centreId): void
    {
        FeeSetting::query()
            ->where('is_active', true)
            ->when(
                $centreId === null,
                fn ($q) => $q->whereNull('centre_id'),
                fn ($q) => $q->where('centre_id', $centreId),
            )
            ->update(['is_active' => false]);
    }
}
