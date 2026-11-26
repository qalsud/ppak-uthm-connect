<?php

namespace App\Http\Controllers\Parent;

use App\Http\Controllers\Controller;
use App\Models\DailyActivity;
use App\Models\ProgressRecord;
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

            $latestProgress = ProgressRecord::query()
                ->where('student_id', $child->id)
                ->latest('date')
                ->with(['photos.uploadedBy:id,name', 'groupActivity.photos.uploadedBy:id,name'])
                ->first();

            if ($latestProgress) {
                $latestProgress->setAttribute('is_group', $latestProgress->group_activity_id !== null);
                $latestProgress->setAttribute(
                    'group_photo',
                    $latestProgress->groupActivity?->latestPhoto()?->payload(),
                );
            }

            $child->latest_progress = $latestProgress;

            $child->recent_activities = $child->dailyActivities()
                ->latest('date')
                ->limit(5)
                ->get(['id', 'date'])
                ->map(fn ($a) => ['id' => $a->id, 'date' => $a->date->format('d M Y')]);

            $child->recent_progress = ProgressRecord::query()
                ->where('student_id', $child->id)
                ->latest('date')
                ->limit(5)
                ->with(['photos.uploadedBy:id,name', 'groupActivity.photos.uploadedBy:id,name'])
                ->get([
                    'id', 'date', 'sub_theme', 'activity_done', 'child_proficiency',
                    'permata_activity', 'free_activity', 'development_proficiency', 'group_activity_id',
                ])
                ->map(fn (ProgressRecord $p) => [
                    'id' => $p->id,
                    'date' => $p->date->format('d M Y'),
                    'sub_theme' => $p->sub_theme,
                    'activity_done' => $p->activity_done,
                    'child_proficiency' => $p->child_proficiency,
                    'development' => $p->development_proficiency,
                    'photo' => $p->latestPhoto()?->payload(),
                    'is_group' => $p->group_activity_id !== null,
                    'group_photo' => $p->groupActivity?->latestPhoto()?->payload(),
                ]);
        });

        return Inertia::render('Parent/Activities', [
            'children' => $children,
            'fields' => DailyActivity::fields(),
        ]);
    }
}
