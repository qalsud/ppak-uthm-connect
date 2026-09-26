<?php

namespace App\Http\Controllers\Parent;

use App\Http\Controllers\Controller;
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
            ->get(['id', 'name', 'age', 'class']);

        $children->each(function ($child) {
            $unpaid = $child->financialRecords()->where('status', 'unpaid')->sum('amount');
            $child->unpaid = (float) $unpaid;
            $child->latest_update_date = $child->dailyUpdates()->latest('date')->value('date')?->format('Y-m-d');
            $child->latest_activity_date = $child->dailyActivities()->latest('date')->value('date')?->format('Y-m-d');
        });

        $studentIds = $children->pluck('id');

        $unread = $studentIds->isNotEmpty()
            ? Conversation::query()
                ->whereIn('student_id', $studentIds)
                ->get()
                ->sum(fn ($c) => $c->messages()->where('sender_id', '!=', auth()->id())->whereNull('read_at')->count())
            : 0;

        $totalUnpaid = $children->sum('unpaid');
        $memoCount = Memo::count();

        return Inertia::render('Parent/Dashboard', [
            'children' => $children,
            'unpaidTotal' => $totalUnpaid,
            'memoCount' => $memoCount,
            'unreadCount' => $unread,
        ]);
    }
}
