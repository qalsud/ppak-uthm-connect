<?php

use App\Enums\UserRole;
use App\Models\AbsenceRequest;
use App\Models\ActivityLog;
use App\Models\Attendance;
use App\Models\Student;
use App\Models\User;

function attendanceCast(): array
{
    $parent = User::factory()->role(UserRole::Parent)->create();
    $student = Student::factory()->create(['parent_id' => $parent->id, 'class' => '5tahun']);
    $teacher = User::factory()->role(UserRole::Teacher)->create(['class' => '5tahun']);

    return [$parent, $student, $teacher];
}

test('future attendance is rejected unless it corrects an approved absence', function () {
    [, $student, $teacher] = attendanceCast();
    $future = today()->addDays(2)->toDateString();

    $this->actingAs($teacher)
        ->post(route('teacher.attendance.store', $student), [
            'action' => 'arrive',
            'date' => $future,
        ])
        ->assertSessionHasErrors('date');

    expect(Attendance::whereDate('date', $future)->exists())->toBeFalse();

    $absence = AbsenceRequest::create([
        'student_id' => $student->id,
        'requested_by' => $student->parent_id,
        'start_date' => $future,
        'end_date' => $future,
        'type' => 'sick',
        'status' => 'approved',
    ]);
    $absence->syncAttendance();

    $this->actingAs($teacher)
        ->post(route('teacher.attendance.store', $student), [
            'action' => 'arrive',
            'date' => $future,
        ])
        ->assertRedirect();

    expect(Attendance::whereDate('date', $future)->first()->status())->toBe('school');
});

test('backdated attendance writes to the selected day and is audited', function () {
    [, $student, $teacher] = attendanceCast();
    $yesterday = today()->subDay()->toDateString();

    $this->actingAs($teacher)
        ->post(route('teacher.attendance.store', $student), [
            'action' => 'arrive',
            'date' => $yesterday,
        ])
        ->assertRedirect();

    expect(Attendance::whereDate('date', $yesterday)->exists())->toBeTrue()
        ->and(Attendance::whereDate('date', today())->exists())->toBeFalse()
        ->and(ActivityLog::where('action', 'attendance.arrived')->exists())->toBeTrue();
});

test('a parent cannot backdate an absence', function () {
    [$parent, $student] = attendanceCast();

    $this->actingAs($parent)
        ->post(route('parent.absences.store', $student), [
            'start_date' => today()->subDays(2)->toDateString(),
            'end_date' => today()->subDays(2)->toDateString(),
            'type' => 'sick',
        ])
        ->assertSessionHasErrors('start_date');

    expect(AbsenceRequest::count())->toBe(0);
});

test('a parent cannot file an absence for a day the child already attended', function () {
    [$parent, $student] = attendanceCast();

    Attendance::create([
        'student_id' => $student->id,
        'date' => today(),
        'arrived_at' => now(),
    ]);

    $this->actingAs($parent)
        ->post(route('parent.absences.store', $student), [
            'start_date' => today()->toDateString(),
            'end_date' => today()->toDateString(),
            'type' => 'sick',
        ])
        ->assertSessionHasErrors('start_date');

    expect(AbsenceRequest::count())->toBe(0);
});

test('an absence cannot be approved for a day the child already attended', function () {
    [, $student, $teacher] = attendanceCast();
    $date = today()->addDay()->toDateString();

    Attendance::create([
        'student_id' => $student->id,
        'date' => $date,
        'arrived_at' => now(),
    ]);

    $absence = AbsenceRequest::create([
        'student_id' => $student->id,
        'requested_by' => $student->parent_id,
        'start_date' => $date,
        'end_date' => $date,
        'type' => 'sick',
        'status' => 'pending',
    ]);

    $this->actingAs($teacher)
        ->post(route('teacher.absences.update', $absence), ['status' => 'approved'])
        ->assertSessionHasErrors('status');

    expect($absence->fresh()->status)->toBe('pending');
});

test('a teacher can mark a child absent and the reason is visible', function () {
    [$parent, $student, $teacher] = attendanceCast();

    $this->actingAs($teacher)
        ->post(route('teacher.attendance.absent', $student), [
            'absence_type' => 'sick',
            'absence_note' => 'Fever at home',
            'date' => today()->toDateString(),
        ])
        ->assertRedirect();

    $attendance = Attendance::whereDate('date', today())->firstOrFail();

    expect($attendance->status())->toBe('absent')
        ->and($attendance->absence_type)->toBe('sick')
        ->and($attendance->absence_note)->toBe('Fever at home');

    $this->actingAs($parent)
        ->get(route('parent.attendance.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('children.0.attendance.status', 'absent')
            ->where('children.0.attendance.absence_note', 'Fever at home'));
});

test('a child who already attended cannot be marked absent', function () {
    [, $student, $teacher] = attendanceCast();

    Attendance::create([
        'student_id' => $student->id,
        'date' => today(),
        'arrived_at' => now(),
    ]);

    $this->actingAs($teacher)
        ->post(route('teacher.attendance.absent', $student), [
            'absence_type' => 'sick',
            'date' => today()->toDateString(),
        ])
        ->assertSessionHasErrors('absence_type');
});
