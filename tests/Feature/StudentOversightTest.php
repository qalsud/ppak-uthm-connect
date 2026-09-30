<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\AbsenceRequest;
use App\Models\GrowthRecord;
use App\Models\MedicationRequest;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('the student detail page shows absences, medication and growth', function () {
    $admin = User::factory()->role(UserRole::Admin)->create();
    $student = Student::factory()->create();

    AbsenceRequest::create([
        'student_id' => $student->id,
        'start_date' => today()->addDay()->toDateString(),
        'end_date' => today()->addDays(2)->toDateString(),
        'type' => 'sick',
        'status' => 'pending',
    ]);

    MedicationRequest::create([
        'student_id' => $student->id,
        'date' => today()->toDateString(),
        'medicine' => 'Paracetamol',
        'status' => 'given',
    ]);

    GrowthRecord::create([
        'student_id' => $student->id,
        'date' => today()->toDateString(),
        'height_cm' => 110.5,
        'weight_kg' => 18.2,
        'bmi' => 14.9,
    ]);

    $this->actingAs($admin)
        ->get(route('admin.students.show', $student))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Student')
            ->has('absences', 1)
            ->has('medications', 1)
            ->has('growth', 1)
            ->where('medications.0.medicine', 'Paracetamol')
            ->where('growth.0.bmi', 14.9)
        );
});
