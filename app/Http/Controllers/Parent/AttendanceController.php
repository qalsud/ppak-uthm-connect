<?php

namespace App\Http\Controllers\Parent;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Student;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceController extends Controller
{
    public function index(Request $request): Response
    {
        $children = $request->user()
            ->students()
            ->get(['id', 'name', 'class']);

        $today = Attendance::todayFor($children->pluck('id'));

        $children->each(function (Student $child) use ($today) {
            $child->attendance = $today->get($child->id)?->summary() ?? Attendance::emptySummary();
            $child->history = Attendance::historyFor($child->id)
                ->map(fn (Attendance $a) => $a->historyRow())
                ->values();
        });

        return Inertia::render('Parent/Attendance', [
            'children' => $children,
        ]);
    }
}
