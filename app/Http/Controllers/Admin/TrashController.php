<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AbsenceRequest;
use App\Models\ActivityLog;
use App\Models\AuthorisedCollector;
use App\Models\EmergencyContact;
use App\Models\FinancialRecord;
use App\Models\Guardian;
use App\Models\Memo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Everything an admin deletes is soft-deleted, so it can be brought back.
 * This screen lists what is recoverable, grouped by type.
 */
class TrashController extends Controller
{
    /** Model class => [label key, optional parent lookup for context]. */
    private const RECOVERABLE = [
        FinancialRecord::class,
        Memo::class,
        Guardian::class,
        EmergencyContact::class,
        AuthorisedCollector::class,
        AbsenceRequest::class,
    ];

    public function index(Request $request): Response
    {
        $groups = collect(self::RECOVERABLE)->map(function (string $model) {
            $items = $model::onlyTrashed()
                ->latest('deleted_at')
                ->limit(100)
                ->get()
                ->map(fn ($row) => [
                    'id' => $row->id,
                    'deleted_at' => $row->deleted_at?->format('Y-m-d H:i'),
                    'summary' => $this->summarise($row),
                ])
                ->values();

            return [
                'type' => class_basename($model),
                'label' => class_basename($model),
                'count' => $model::onlyTrashed()->count(),
                'items' => $items,
            ];
        })->filter(fn ($group) => $group['count'] > 0)->values();

        return Inertia::render('Admin/Trash', [
            'groups' => $groups,
            'total' => $groups->sum('count'),
        ]);
    }

    public function restore(Request $request, string $type, int $id): RedirectResponse
    {
        $model = $this->resolve($type);

        $record = $model::onlyTrashed()->findOrFail($id);
        $record->restore();

        ActivityLog::record('trash.restored', null, class_basename($model), ['id' => $id]);

        return back()->with('success', __('approval.restored'));
    }

    /** @return class-string */
    private function resolve(string $type): string
    {
        foreach (self::RECOVERABLE as $model) {
            if (class_basename($model) === $type) {
                return $model;
            }
        }

        abort(404);
    }

    /** A short human description so the admin knows what they are restoring. */
    private function summarise(object $row): string
    {
        return match (true) {
            $row instanceof FinancialRecord => trim(($row->month ?? '').' · RM '.number_format((float) $row->amount, 2)),
            $row instanceof Memo => (string) $row->title,
            $row instanceof Guardian => trim($row->name.' · '.$row->relationship),
            $row instanceof EmergencyContact => trim($row->name.' · '.$row->phone),
            $row instanceof AuthorisedCollector => (string) $row->name,
            $row instanceof AbsenceRequest => trim(
                ($row->student?->name ?? '').' · '.$row->start_date?->format('d/m/Y').' → '.$row->end_date?->format('d/m/Y')
            ),
            default => '#'.$row->getKey(),
        };
    }
}
