<?php

namespace App\Http\Controllers\Parent;

use App\Http\Controllers\Controller;
use App\Models\DailyUpdate;
use App\Models\Student;
use App\Models\User;
use App\Notifications\DailyUpdateSubmittedNotification;
use App\Support\Lists;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DailyUpdateController extends Controller
{
    public function index(Request $request): Response
    {
        $children = $request->user()->students()->active()->get(['id', 'name', 'class']);
        $selected = $request->input('student_id')
            ? $children->firstWhere('id', (int) $request->input('student_id'))
            : $children->first();

        // Only pre-fill from today's update, so stale values are never reused.
        $existing = $selected
            ? DailyUpdate::query()
                ->where('student_id', $selected->id)
                ->whereDate('date', today())
                ->first()
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
            'date' => 'required|date|before_or_equal:today',
            'arrival_time' => ['required', 'regex:/^\d{1,2}:\d{2}(:\d{2})?$/'],
            'sleep_status' => ['required', Rule::in(Lists::keys('sleep_status'))],
            'bath_status' => ['required', Rule::in(Lists::keys('bath_status'))],
            'health_status' => 'nullable|string|max:50',
            'parent_notes' => 'nullable|string|max:1000',
        ]);

        // Normalise arrival time to HH:MM (accepts HH:MM and HH:MM:SS).
        [$hour, $minute] = array_pad(explode(':', $validated['arrival_time']), 2, '0');
        $validated['arrival_time'] = sprintf('%02d:%02d', (int) $hour, (int) $minute);

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
            $record = DailyUpdate::create($validated);
        }

        // Notify the teaching team *at this child's centre* — a class key like
        // "5tahun" exists at every centre, so notifying all teachers would reach
        // the wrong one.
        $student = Student::find($validated['student_id']);
        $teachers = $student ? User::staffForStudent($student) : collect();

        if ($teachers->isNotEmpty()) {
            Notification::send($teachers, new DailyUpdateSubmittedNotification($student, $record));
        }

        return back()->with('success', __('approval.daily_update_saved'));
    }
}
