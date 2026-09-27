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
        $children = $request->user()->students()->active()->get(['id', 'name']);

        $children->each(function ($child) {
            $child->latest_activity = $child->dailyActivities()->latest('date')->with('teacher:id,name')->first();
            $child->latest_progress = $child->progressRecords()->latest('date')->with('photos.uploadedBy:id,name')->first();

            $child->recent_activities = $child->dailyActivities()
                ->latest('date')
                ->limit(5)
                ->get(['id', 'date'])
                ->map(fn ($a) => ['id' => $a->id, 'date' => $a->date->format('d M Y')]);

            $child->recent_progress = $child->progressRecords()
                ->latest('date')
                ->limit(5)
                ->with('photos.uploadedBy:id,name')
                ->get([
                    'id', 'date', 'sub_theme', 'activity_done', 'child_proficiency',
                    'permata_activity', 'free_activity', 'development_proficiency',
                ])
                ->map(fn ($p) => [
                    'id' => $p->id,
                    'date' => $p->date->format('d M Y'),
                    'sub_theme' => $p->sub_theme,
                    'activity_done' => $p->activity_done,
                    'child_proficiency' => $p->child_proficiency,
                    'development' => $p->development_proficiency,
                    'photo' => $p->photo,
                ]);
        });

        return Inertia::render('Parent/Activities', [
            'children' => $children,
            'fields' => DailyActivity::FIELDS,
        ]);
    }
}
