<?php

namespace App\Http\Controllers\Parent;

use App\Http\Controllers\Controller;
use App\Models\AbsenceRequest;
use App\Models\ActivityLog;
use App\Models\Attendance;
use App\Models\DailyActivity;
use App\Models\GrowthRecord;
use App\Models\MedicationRequest;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
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
                'centre' => $student->centre?->name,
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
            'fields' => DailyActivity::fields(),
            'profile' => $student->profile(),
        ]);
    }

    /**
     * A parent submits corrections to their child's record. Safety-critical
     * medical fields are applied by an admin, so this records a change request
     * rather than writing straight through (PDPA accuracy + oversight).
     */
    public function updateProfile(Request $request, Student $student): RedirectResponse
    {
        abort_unless($student->parent_id === $request->user()->id, 403);

        $data = $request->validate([
            'address' => ['nullable', 'string', 'max:1000'],
            'allergies' => ['nullable', 'string', 'max:1000'],
            'medical_notes' => ['nullable', 'string', 'max:1000'],
            'dietary_restrictions' => ['nullable', 'string', 'max:1000'],
            'doctor_name' => ['nullable', 'string', 'max:150'],
            'doctor_phone' => ['nullable', 'string', 'max:40'],
            'medical_consent' => ['nullable', 'boolean'],
        ]);

        $student->update([
            ...$data,
            'medical_consent' => (bool) ($data['medical_consent'] ?? false),
            'medical_consent_at' => ! empty($data['medical_consent'])
                ? ($student->medical_consent_at ?? now())
                : null,
        ]);

        ActivityLog::record('student.profile_updated', $student, $student->name);

        return back()->with('success', __('approval.profile_updated'));
    }
}
