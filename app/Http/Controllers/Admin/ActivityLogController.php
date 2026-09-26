<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ActivityLogController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));

        $logs = ActivityLog::query()
            ->with('user:id,name')
            ->when($search !== '', fn ($query) => $query->where(function ($w) use ($search) {
                $w->where('action', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$search}%"));
            }))
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
            'filters' => ['search' => $search],
        ]);
    }
}
