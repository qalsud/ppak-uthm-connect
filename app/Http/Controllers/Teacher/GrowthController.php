<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\GrowthRecord;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GrowthController extends Controller
{
    public function index(Request $request): Response
    {
        $assigned = $request->user()->assignedClass();

        $class = $assigned ?? (in_array($request->query('class'), Student::classKeys(), true)
            ? $request->query('class')
            : null);

        $students = Student::query()
            ->active()
            ->visibleTo($request->user())->inClass($class)
            ->orderBy('name')
            ->get(['id', 'name', 'class']);

        $ids = $students->pluck('id');

        $records = GrowthRecord::query()
            ->whereIn('student_id', $ids)
            ->with(['student:id,name', 'recordedBy:id,name'])
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->limit(60)
            ->get()
            ->map(fn (GrowthRecord $record) => $record->summary())
            ->values();

        // Latest measurement per child — used for the table and the class average.
        $latest = GrowthRecord::query()
            ->whereIn('student_id', $ids)
            ->with(['student:id,name', 'recordedBy:id,name'])
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->get()
            ->unique('student_id')
            ->sortBy('student.name')
            ->map(fn (GrowthRecord $record) => $record->summary())
            ->values();

        $bmis = $latest->pluck('bmi')->filter(fn ($bmi) => $bmi !== null);

        return Inertia::render('Teacher/Growth', [
            'shell' => $request->user()->shell(),
            'students' => $students,
            'records' => $records,
            'latest' => $latest,
            'averageBmi' => $bmis->isEmpty() ? null : round($bmis->avg(), 1),
            'selectedClass' => $class,
            'assignedClass' => $assigned,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'student_id' => ['required', 'exists:students,id'],
            'date' => ['required', 'date', 'before_or_equal:today'],
            'height_cm' => ['nullable', 'numeric', 'between:30,200'],
            'weight_kg' => ['nullable', 'numeric', 'between:2,150'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $student = Student::findOrFail($data['student_id']);
        abort_unless($request->user()->canManage($student), 403);

        $record = GrowthRecord::firstOrNew([
            'student_id' => $student->id,
            'date' => $data['date'],
        ]);

        $record->fill([
            'height_cm' => $data['height_cm'] ?? $record->height_cm,
            'weight_kg' => $data['weight_kg'] ?? $record->weight_kg,
            'notes' => $data['notes'] ?? $record->notes,
            'recorded_by' => $request->user()->id,
        ]);

        $record->bmi = GrowthRecord::bmiFor(
            $record->height_cm !== null ? (float) $record->height_cm : null,
            $record->weight_kg !== null ? (float) $record->weight_kg : null,
        );

        $record->save();

        ActivityLog::record('growth.recorded', $record, $student->name, ['date' => $data['date']]);

        return back()->with('success', __('approval.growth_saved'));
    }
}
