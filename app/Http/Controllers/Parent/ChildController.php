<?php

namespace App\Http\Controllers\Parent;

use App\Http\Controllers\Controller;
use App\Models\AbsenceRequest;
use App\Models\Attendance;
use App\Models\DailyActivity;
use App\Models\GrowthRecord;
use App\Models\MedicationRequest;
use App\Models\Student;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ChildController extends Controller
{
    public function show(Request $request, Student $student): Response
    {
        abort_unless($student->parent_id === $request->user()->id, 403);

        return Inertia::render('Parent/Child', [
            'child' => [
                'id' => $student->id,
                'name' => $student->name,
                'age' => $student->age,
                'class' => $student->classLabel,
                'unpaid' => (float) $student->financialRecords()->where('status', 'unpaid')->sum('amount'),
                'attendance' => Attendance::todayFor([$student->id])->get($student->id)?->summary() ?? Attendance::emptySummary(),
            ],
            'updates' => $student->dailyUpdates()
                ->latest('date')
                ->limit(7)
                ->get(['id', 'date', 'arrival_time', 'sleep_status', 'bath_status', 'health_status', 'parent_notes']),
            'activities' => $student->dailyActivities()
                ->with('teacher:id,name')
                ->latest('date')
                ->limit(7)
                ->get(),
            'progress' => $student->progressRecords()
                ->with('photos.uploadedBy:id,name')
                ->latest('date')
                ->limit(7)
                ->get(),
            'attendanceHistory' => Attendance::historyFor($student->id, 14)
                ->map(fn (Attendance $a) => $a->historyRow())
                ->values(),
            'absences' => $student->absenceRequests()
                ->with('attachments')
                ->latest('start_date')
                ->limit(6)
                ->get()
                ->map(fn (AbsenceRequest $a) => $a->summary())
                ->values(),
            'medications' => $student->medicationRequests()
                ->latest('date')
                ->latest('id')
                ->limit(10)
                ->get()
                ->map(fn (MedicationRequest $m) => $m->summary())
                ->values(),
            'growth' => $student->growthRecords()
                ->latest('date')
                ->latest('id')
                ->limit(12)
                ->get()
                ->map(fn (GrowthRecord $r) => $r->summary())
                ->values(),
            'fields' => DailyActivity::FIELDS,
        ]);
    }
}
