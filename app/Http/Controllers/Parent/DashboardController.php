<?php

namespace App\Http\Controllers\Parent;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Conversation;
use App\Models\Memo;
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
            ->get(['id', 'name', 'age', 'class', 'centre_id']);

        $children->each(function ($child) {
            $unpaid = $child->financialRecords()->where('status', 'unpaid')->sum('amount');
            $child->unpaid = (float) $unpaid;
        });

        $attendance = Attendance::todayFor($children->pluck('id'));
        $children->each(function ($child) use ($attendance) {
            $child->attendance = $attendance->get($child->id)?->summary() ?? Attendance::emptySummary();
        });

        $studentIds = $children->pluck('id');

        $unread = $studentIds->isNotEmpty()
            ? Conversation::query()
                ->whereIn('student_id', $studentIds)
                ->get()
                ->sum(fn ($c) => $c->messages()->where('sender_id', '!=', auth()->id())->whereNull('read_at')->count())
            : 0;

        $totalUnpaid = $children->sum('unpaid');
        // Only memos this parent's children should see (audience + centre aware).
        $childClasses = $children->pluck('class')->unique()->filter()->all();
        $childCentres = $children->pluck('centre_id')->unique()->filter()->all();

        $memoCount = Memo::query()
            ->whereIn('audience', ['all', 'parents'])
            ->orWhere(fn ($q) => $q->where('audience', 'class')->whereIn('class', $childClasses))
            ->when($childCentres, fn ($q) => $q->where(fn ($w) => $w
                ->whereIn('centre_id', $childCentres)
                ->orWhereNull('centre_id')))
            ->count();

        return Inertia::render('Parent/Dashboard', [
            'children' => $children,
            'unpaidTotal' => $totalUnpaid,
            'memoCount' => $memoCount,
            'unreadCount' => $unread,
        ]);
    }
}
