<?php

namespace App\Http\Controllers\Parent;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Memo;
use App\Models\Message;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $children = $request->user()
            ->students()
            ->active()
            ->with('centre:id,name')
            ->withSum(
                ['financialRecords as unpaid_total' => fn ($q) => $q->where('status', 'unpaid')],
                'amount',
            )
            ->get(['id', 'name', 'age', 'class', 'centre_id']);

        $children->each(function ($child) {
            $child->unpaid = (float) ($child->unpaid_total ?? 0);
        });

        $attendance = Attendance::todayFor($children->pluck('id'));
        $children->each(function ($child) use ($attendance) {
            $child->attendance = $attendance->get($child->id)?->summary() ?? Attendance::emptySummary();
        });

        $studentIds = $children->pluck('id');

        $unread = $studentIds->isNotEmpty()
            ? Message::query()
                ->whereNull('read_at')
                ->where('sender_id', '!=', auth()->id())
                ->whereHas('conversation', fn ($q) => $q->whereIn('student_id', $studentIds))
                ->count()
            : 0;

        $totalUnpaid = $children->sum('unpaid');
        $memoCount = Memo::query()->visibleTo($request->user())->count();

        return Inertia::render('Parent/Dashboard', [
            'children' => $children,
            'unpaidTotal' => $totalUnpaid,
            'memoCount' => $memoCount,
            'unreadCount' => $unread,
        ]);
    }
}
