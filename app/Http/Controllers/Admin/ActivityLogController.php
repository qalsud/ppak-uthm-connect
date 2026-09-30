<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ActivityLogController extends Controller
{
    public function index(Request $request): Response
    {
        $logs = $this->query($request)
            ->orderByDesc('id')
            ->paginate(30)
            ->withQueryString()
            ->through(fn (ActivityLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'label' => $log->label(),
                'description' => $log->description,
                'user' => $log->user?->name ?? '—',
                'ip' => $log->ip,
                'created_at' => $log->created_at?->format('d M Y, H:i'),
            ]);

        return Inertia::render('Admin/Activity', [
            'logs' => $logs,
            'users' => User::query()
                ->whereIn('id', ActivityLog::query()->select('user_id')->distinct())
                ->orderBy('name')
                ->get(['id', 'name']),
            'actions' => ActivityLog::query()
                ->select('action')
                ->distinct()
                ->orderBy('action')
                ->pluck('action'),
            'filters' => $this->filters($request),
        ]);
    }

    /** Export the currently-filtered audit trail as CSV. */
    public function export(Request $request): StreamedResponse
    {
        $logs = $this->query($request)->orderByDesc('id')->limit(20000)->get();

        return response()->streamDownload(function () use ($logs) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Time', 'User', 'Action', 'Label', 'Description', 'IP']);

            foreach ($logs as $log) {
                fputcsv($out, [
                    $log->created_at?->format('Y-m-d H:i'),
                    $log->user?->name ?? '',
                    $log->action,
                    $log->label(),
                    $log->description ?? '',
                    $log->ip ?? '',
                ]);
            }

            fclose($out);
        }, 'activity-log.csv', ['Content-Type' => 'text/csv']);
    }

    /** The filtered log query — shared by the index and the CSV export. */
    private function query(Request $request): Builder
    {
        $search = trim((string) $request->query('search', ''));
        $userId = $request->query('user');
        $action = $request->query('action');
        $from = $this->dateOrNull($request->query('from'));
        $to = $this->dateOrNull($request->query('to'));

        return ActivityLog::query()
            ->with('user:id,name')
            ->when($search !== '', fn ($q) => $q->where(function ($w) use ($search) {
                $w->where('action', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$search}%"));
            }))
            ->when(is_numeric($userId), fn ($q) => $q->where('user_id', (int) $userId))
            ->when($action, fn ($q) => $q->where('action', $action))
            ->when($from, fn ($q) => $q->whereDate('created_at', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('created_at', '<=', $to));
    }

    /** @return array<string, string> */
    private function filters(Request $request): array
    {
        return [
            'search' => trim((string) $request->query('search', '')),
            'user' => (string) $request->query('user', ''),
            'action' => (string) $request->query('action', ''),
            'from' => (string) $request->query('from', ''),
            'to' => (string) $request->query('to', ''),
        ];
    }

    private function dateOrNull(mixed $value): ?string
    {
        if (! $value) {
            return null;
        }

        try {
            return Carbon::parse((string) $value)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }
}
