<?php

namespace App\Http\Controllers\Parent;

use App\Http\Controllers\Controller;
use App\Models\DailyUpdate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DailyUpdateController extends Controller
{
    public function index(Request $request): Response
    {
        $children = $request->user()->students()->get(['id', 'name', 'class']);
        $selected = $request->input('student_id')
            ? $children->firstWhere('id', (int) $request->input('student_id'))
            : $children->first();

        $existing = $selected
            ? DailyUpdate::query()->where('student_id', $selected->id)->latest('date')->first()
            : null;

        return Inertia::render('Parent/DailyUpdate', [
            'children' => $children,
            'selected' => $selected ? ['id' => $selected->id, 'name' => $selected->name, 'class' => $selected->classLabel] : null,
            'existing' => $existing,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'student_id' => 'required|exists:students,id',
            'date' => 'required|date',
            'arrival_time' => 'required|date_format:H:i',
            'sleep_status' => ['required', Rule::in(['Good', 'Poor'])],
            'bath_status' => ['required', Rule::in(['Done', 'Not Done'])],
            'health_status' => 'nullable|string|max:50',
            'parent_notes' => 'nullable|string|max:1000',
        ]);

        // A parent may only post updates for their own children.
        $own = $request->user()->students()->whereKey($validated['student_id'])->exists();
        abort_unless($own, 403);

        $record = DailyUpdate::query()
            ->where('student_id', $validated['student_id'])
            ->whereDate('date', $validated['date'])
            ->first();

        if ($record) {
            $record->update($validated);
        } else {
            DailyUpdate::create($validated);
        }

        return back()->with('success', __('approval.daily_update_saved'));
    }
}
