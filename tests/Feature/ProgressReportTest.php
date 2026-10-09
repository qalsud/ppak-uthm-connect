<?php

use App\Enums\UserRole;
use App\Models\ProgressRecord;
use App\Models\Student;
use App\Models\User;
use App\Services\Reports\ProgressReport;

/**
 * @return array{0: User, 1: Student}
 */
function progressChild(): array
{
    $parent = User::factory()->role(UserRole::Parent)->create();
    $student = Student::factory()->create(['parent_id' => $parent->id, 'class' => '5tahun']);

    return [$parent, $student];
}

function progressRecord(Student $student, User $teacher, string $date, array $overrides = []): ProgressRecord
{
    return ProgressRecord::create([
        'student_id' => $student->id,
        'teacher_id' => $teacher->id,
        'date' => $date,
        'sub_theme' => 'Fruits',
        'activity_done' => 'Good',
        'child_proficiency' => 'Good',
        'permata_activity' => 'Drawing',
        'free_activity' => 'Playing',
        'development_proficiency' => 'Social Skills',
        'notes' => 'Nice work',
        ...$overrides,
    ]);
}

test('a teacher can download a progress report for a student in their class', function () {
    $teacher = User::factory()->role(UserRole::Teacher)->create(['class' => '5tahun']);
    [, $student] = progressChild();
    progressRecord($student, $teacher, now()->subDays(5)->toDateString());

    $response = $this->actingAs($teacher)->get(route('teacher.progress.report', [
        'student' => $student->id,
        'from' => now()->subDays(30)->toDateString(),
        'to' => now()->toDateString(),
    ]));

    $response->assertOk();
    expect($response->headers->get('content-type'))->toContain('pdf');
});

test('a teacher cannot download a report for another class', function () {
    $teacher = User::factory()->role(UserRole::Teacher)->create(['class' => '6bintang']);
    [, $student] = progressChild();

    $this->actingAs($teacher)
        ->get(route('teacher.progress.report', $student))
        ->assertForbidden();
});

test('a parent can download their own child report but not another child', function () {
    [$parent, $student] = progressChild();
    [$otherParent] = progressChild();

    $this->actingAs($parent)
        ->get(route('parent.children.progress-report', $student))
        ->assertOk();

    $this->actingAs($otherParent)
        ->get(route('parent.children.progress-report', $student))
        ->assertForbidden();
});

test('an admin can download any student progress report', function () {
    $admin = User::factory()->role(UserRole::Admin)->create();
    [, $student] = progressChild();

    $this->actingAs($admin)
        ->get(route('admin.register.progress.report', $student))
        ->assertOk();
});

test('the report period filters the included records', function () {
    $teacher = User::factory()->role(UserRole::Teacher)->create(['class' => '5tahun']);
    [, $student] = progressChild();
    progressRecord($student, $teacher, now()->subDays(100)->toDateString(), ['child_proficiency' => 'Poor']);
    progressRecord($student, $teacher, now()->subDays(5)->toDateString());

    $report = app(ProgressReport::class);

    $all = $report->data($student, null, null);
    $recent = $report->data($student, now()->subDays(30)->toDateString(), now()->toDateString());

    expect($all['counts']['total'])->toBe(2)
        ->and($all['counts']['good'])->toBe(1)
        ->and($all['counts']['poor'])->toBe(1)
        ->and($recent['counts']['total'])->toBe(1);
});
