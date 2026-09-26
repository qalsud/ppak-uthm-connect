<?php

namespace App\Http\Controllers\Parent;

use App\Http\Controllers\Controller;
use App\Models\DailyActivity;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ActivityController extends Controller
{
    public function index(Request $request): Response
    {
        $children = $request->user()->students()->get(['id', 'name']);

        $children->each(function ($child) {
            $child->latest_activity = $child->dailyActivities()->latest('date')->with('teacher:id,name')->first();
            $child->latest_progress = $child->progressRecords()->latest('date')->first();
        });

        return Inertia::render('Parent/Activities', [
            'children' => $children,
            'fields' => DailyActivity::FIELDS,
        ]);
    }
}
