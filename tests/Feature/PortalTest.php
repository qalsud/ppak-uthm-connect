<?php

use App\Enums\UserRole;
use App\Models\DailyActivity;
use App\Models\DailyUpdate;
use App\Models\FinancialRecord;
use App\Models\ProgressRecord;
use App\Models\Student;
use App\Models\User;

function teacherPortal(): User
{
    return User::factory()->role(UserRole::Teacher)->create();
}

function parentWithStudents(int $count = 1): array
{
    $parent = User::factory()->role(UserRole::Parent)->create();
    $students = Student::factory()->count($count)->create(['parent_id' => $parent->id]);

    return [$parent, $students];
}

test('teacher can access the teacher portal but not admin or parent areas', function () {
    $teacher = teacherPortal();

    $this->actingAs($teacher)->get('/teacher')->assertOk();
    $this->actingAs($teacher)->get('/teacher/activities')->assertOk();
    $this->actingAs($teacher)->get('/teacher/progress')->assertOk();
    $this->actingAs($teacher)->get('/teacher/daily-updates')->assertOk();
    $this->actingAs($teacher)->get('/teacher/memos')->assertOk();

    $this->actingAs($teacher)->get('/admin')->assertForbidden();
    $this->actingAs($teacher)->get('/parent')->assertForbidden();
});

test('parent can access the parent portal but not teacher or admin areas', function () {
    [$parent] = parentWithStudents();

    $this->actingAs($parent)->get('/parent')->assertOk();
    $this->actingAs($parent)->get('/parent/daily-update')->assertOk();
    $this->actingAs($parent)->get('/parent/activities')->assertOk();
    $this->actingAs($parent)->get('/parent/financials')->assertOk();
    $this->actingAs($parent)->get('/parent/memos')->assertOk();

    $this->actingAs($parent)->get('/teacher')->assertForbidden();
    $this->actingAs($parent)->get('/admin')->assertForbidden();
});

test('teacher can record daily activities', function () {
    $teacher = teacherPortal();
    $student = Student::factory()->create();

    $this->actingAs($teacher)->post(route('teacher.activities.store'), [
        'student_id' => $student->id,
        'date' => today()->toDateString(),
        'treatment_notes' => 'OK',
        'statuses' => [
            'afternoon_sleep' => 'yes',
            'medication' => 'no',
            'shower' => 'yes',
            'breakfast' => 'yes',
            'injuries' => 'no',
        ],
    ])->assertRedirect();

    $record = DailyActivity::query()
        ->where('student_id', $student->id)
        ->whereDate('date', today())
        ->first();

    expect($record)->not->toBeNull();
    expect($record->afternoon_sleep)->toBe('yes');
    expect($record->medication)->toBe('no');
    expect($record->teacher_id)->toBe($teacher->id);
});

test('teacher can record progress and update the same day', function () {
    $teacher = teacherPortal();
    $student = Student::factory()->create();
    $payload = [
        'student_id' => $student->id,
        'date' => today()->toDateString(),
        'sub_theme' => 'outdoor',
        'activity_done' => 'Good',
        'child_proficiency' => 'Good',
        'permata_activity' => 'Drawing',
        'free_activity' => 'Learning',
        'development_proficiency' => 'Social Skills',
        'notes' => null,
    ];

    $this->actingAs($teacher)->post(route('teacher.progress.store'), $payload)->assertRedirect();
    $this->actingAs($teacher)->post(route('teacher.progress.store'), [
        ...$payload,
        'notes' => 'updated',
        'activity_done' => 'Average',
    ])->assertRedirect();

    $records = ProgressRecord::query()
        ->where('student_id', $student->id)
        ->whereDate('date', today())
        ->get();

    expect($records)->toHaveCount(1);
    expect($records->first()->notes)->toBe('updated');
});

test('parent can submit a daily update for their own child only', function () {
    [$parent, $children] = parentWithStudents(2);
    $otherParent = User::factory()->role(UserRole::Parent)->create();
    $childOfOtherParent = Student::factory()->create(['parent_id' => $otherParent->id]);

    $this->actingAs($parent)->post(route('parent.daily-update.store'), [
        'student_id' => $children->first()->id,
        'date' => today()->toDateString(),
        'arrival_time' => '07:45',
        'sleep_status' => 'Good',
        'bath_status' => 'Done',
        'health_status' => 'good',
        'parent_notes' => 'Tiada demam',
    ])->assertRedirect();

    expect(DailyUpdate::query()->where('student_id', $children->first()->id)->exists())->toBeTrue();

    // Someone else's child must be rejected.
    $this->actingAs($parent)->post(route('parent.daily-update.store'), [
        'student_id' => $childOfOtherParent->id,
        'date' => today()->toDateString(),
        'arrival_time' => '08:00',
        'sleep_status' => 'Poor',
        'bath_status' => 'Not Done',
    ])->assertForbidden();
});

test('parent dashboard shows unpaid total across children', function () {
    [$parent, $children] = parentWithStudents(2);

    FinancialRecord::create([
        'student_id' => $children->first()->id,
        'month' => 'January',
        'amount' => 310.00,
        'status' => 'unpaid',
    ]);

    $response = $this->actingAs($parent)->get('/parent');

    $response->assertInertia(fn ($page) => $page
        ->component('Parent/Dashboard')
        ->has('children', 2)
        ->where('unpaidTotal', 310));
});
