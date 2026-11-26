<?php

use App\Enums\UserRole;
use App\Models\Centre;
use App\Models\ProgressGroupActivity;
use App\Models\ProgressGroupPhoto;
use App\Models\ProgressRecord;
use App\Models\Student;
use App\Models\User;
use App\Notifications\GroupActivityRecordedNotification;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

/**
 * @return array{0: Centre, 1: User, 2: User, 3: Student, 4: User, 5: Student}
 */
function groupProgressSetup(): array
{
    $centre = Centre::create(['name' => 'Group Centre', 'code' => 'group-centre']);

    $teacher = User::factory()->role(UserRole::Teacher)->create(['class' => '5tahun']);
    $teacher->centres()->attach($centre->id);

    $parentA = User::factory()->role(UserRole::Parent)->create();
    $studentA = Student::factory()->atCentre($centre->id)->create([
        'parent_id' => $parentA->id,
        'class' => '5tahun',
        'name' => 'Child Alpha',
    ]);

    $parentB = User::factory()->role(UserRole::Parent)->create();
    $studentB = Student::factory()->atCentre($centre->id)->create([
        'parent_id' => $parentB->id,
        'class' => '5tahun',
        'name' => 'Child Beta',
    ]);

    return [$centre, $teacher, $parentA, $studentA, $parentB, $studentB];
}

function groupProgressPayload(Centre $centre, array $studentIds, array $overrides = []): array
{
    return array_merge([
        'class' => '5tahun',
        'centre_id' => $centre->id,
        'date' => today()->toDateString(),
        'sub_theme' => 'My Family',
        'permata_activity' => 'Drawing',
        'free_activity' => 'Playing',
        'development_proficiency' => 'Social Skills',
        'notes' => 'Great teamwork.',
        'participants' => array_map(fn (int $id) => [
            'student_id' => $id,
            'activity_done' => 'Good',
            'child_proficiency' => 'Average',
        ], $studentIds),
        'replace_existing' => false,
    ], $overrides);
}

beforeEach(function () {
    Storage::fake('attendance');
    config()->set('media.disk', 'attendance');
});

test('a teacher can record one group activity for several children', function () {
    Notification::fake();

    [$centre, $teacher, $parentA, $studentA, $parentB, $studentB] = groupProgressSetup();

    $this->actingAs($teacher)
        ->post(route('teacher.progress.group.store'), groupProgressPayload(
            $centre,
            [$studentA->id, $studentB->id],
        ))
        ->assertRedirect()
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success');

    $group = ProgressGroupActivity::sole();

    expect($group->class)->toBe('5tahun')
        ->and($group->centre_id)->toBe($centre->id)
        ->and($group->teacher_id)->toBe($teacher->id);

    $records = ProgressRecord::where('group_activity_id', $group->id)->get();

    expect($records)->toHaveCount(2)
        ->and($records->pluck('student_id')->sort()->values()->all())
        ->toBe(collect([$studentA->id, $studentB->id])->sort()->values()->all());

    Notification::assertSentTo($parentA, GroupActivityRecordedNotification::class);
    Notification::assertSentTo($parentB, GroupActivityRecordedNotification::class);

    // The group activity is listed separately and not duplicated as two
    // individual history rows.
    $this->actingAs($teacher)
        ->get(route('teacher.progress.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('groupActivities', 1)
            ->has('records', 0)
            ->where('groupActivities.0.participant_count', 2));
});

test('existing individual records are skipped by default', function () {
    [$centre, $teacher, , $studentA, , $studentB] = groupProgressSetup();

    $existing = ProgressRecord::create([
        'student_id' => $studentA->id,
        'teacher_id' => $teacher->id,
        'date' => today()->toDateString(),
        'sub_theme' => 'Individual work',
        'activity_done' => 'Poor',
        'child_proficiency' => 'Poor',
        'permata_activity' => 'Reading',
        'free_activity' => 'Learning',
        'development_proficiency' => 'Language Skills',
        'notes' => 'Keep this note.',
    ]);

    $this->actingAs($teacher)
        ->post(route('teacher.progress.group.store'), groupProgressPayload(
            $centre,
            [$studentA->id, $studentB->id],
        ))
        ->assertSessionHas('success');

    $group = ProgressGroupActivity::sole();

    expect(ProgressRecord::where('group_activity_id', $group->id)->count())->toBe(1)
        ->and(ProgressRecord::where('group_activity_id', $group->id)->sole()->student_id)
        ->toBe($studentB->id);

    // The skipped child's individual record is untouched.
    $existing->refresh();
    expect($existing->sub_theme)->toBe('Individual work')
        ->and($existing->activity_done)->toBe('Poor')
        ->and($existing->group_activity_id)->toBeNull();
});

test('replace existing updates the child record instead of creating a duplicate', function () {
    [$centre, $teacher, , $studentA, , $studentB] = groupProgressSetup();

    $existing = ProgressRecord::create([
        'student_id' => $studentA->id,
        'teacher_id' => $teacher->id,
        'date' => today()->toDateString(),
        'sub_theme' => 'Individual work',
        'activity_done' => 'Poor',
        'child_proficiency' => 'Poor',
        'permata_activity' => 'Reading',
        'free_activity' => 'Learning',
        'development_proficiency' => 'Language Skills',
        'notes' => 'Old note.',
    ]);

    $this->actingAs($teacher)
        ->post(route('teacher.progress.group.store'), groupProgressPayload(
            $centre,
            [$studentA->id, $studentB->id],
            [
                'sub_theme' => 'Shared theme',
                'replace_existing' => true,
                'participants' => [
                    ['student_id' => $studentA->id, 'activity_done' => 'Average', 'child_proficiency' => 'Good'],
                    ['student_id' => $studentB->id, 'activity_done' => 'Good', 'child_proficiency' => 'Good'],
                ],
            ],
        ))
        ->assertSessionHas('success');

    $existing->refresh();

    expect($existing->sub_theme)->toBe('Shared theme')
        ->and($existing->activity_done)->toBe('Average')
        ->and($existing->group_activity_id)->not->toBeNull()
        ->and(ProgressRecord::count())->toBe(2);
});

test('the conflict endpoint reports which selected children already have a record', function () {
    [$centre, $teacher, , $studentA, , $studentB] = groupProgressSetup();

    ProgressRecord::create([
        'student_id' => $studentA->id,
        'date' => today()->toDateString(),
        'sub_theme' => 'Existing',
        'activity_done' => 'Good',
        'child_proficiency' => 'Good',
        'permata_activity' => 'Drawing',
        'free_activity' => 'Playing',
        'development_proficiency' => 'Social Skills',
    ]);

    $this->actingAs($teacher)
        ->postJson(route('teacher.progress.group.conflicts'), [
            'date' => today()->toDateString(),
            'student_ids' => [$studentA->id, $studentB->id],
        ])
        ->assertOk()
        ->assertJsonPath('count', 1)
        ->assertJsonPath('conflicts.0.name', 'Child Alpha');
});

test('a teacher cannot include a child from another class', function () {
    [$centre, $teacher, , $studentA] = groupProgressSetup();

    $outsider = Student::factory()->atCentre($centre->id)->create([
        'class' => '6bintang',
        'name' => 'Outside Child',
    ]);

    $this->actingAs($teacher)
        ->post(route('teacher.progress.group.store'), groupProgressPayload(
            $centre,
            [$studentA->id, $outsider->id],
        ))
        ->assertSessionHasErrors('participants');

    expect(ProgressGroupActivity::count())->toBe(0);
});

test('a parent sees the group badge and only their own child ratings', function () {
    [$centre, $teacher, $parentA, $studentA, $parentB, $studentB] = groupProgressSetup();

    $this->actingAs($teacher)
        ->post(route('teacher.progress.group.store'), groupProgressPayload(
            $centre,
            [$studentA->id, $studentB->id],
        ));

    $this->actingAs($parentA)
        ->get(route('parent.children.show', $studentA))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('progress.0.is_group', true)
            ->where('progress.0.student_id', $studentA->id)
            ->where('progress.0.activity_done', 'Good'));

    // The other child's name and ratings never reach this parent.
    $response = $this->actingAs($parentA)->get(route('parent.children.show', $studentA));
    $response->assertDontSee('Child Beta');
});

test('deleting a group keeps the child progress rows', function () {
    [$centre, $teacher, , $studentA, , $studentB] = groupProgressSetup();

    $this->actingAs($teacher)
        ->post(route('teacher.progress.group.store'), groupProgressPayload(
            $centre,
            [$studentA->id, $studentB->id],
        ));

    $group = ProgressGroupActivity::sole();
    $recordCount = ProgressRecord::count();

    $this->actingAs($teacher)
        ->delete(route('teacher.progress.group.destroy', $group))
        ->assertRedirect();

    expect(ProgressGroupActivity::find($group->id))->toBeNull()
        ->and(ProgressGroupActivity::withTrashed()->find($group->id)->trashed())->toBeTrue()
        ->and(ProgressRecord::count())->toBe($recordCount);
});

test('an admin can record a group activity through the admin shell routes', function () {
    [$centre, , , $studentA, , $studentB] = groupProgressSetup();
    $admin = User::factory()->role(UserRole::Admin)->create();

    $this->actingAs($admin)
        ->post(route('admin.register.progress.group.store'), groupProgressPayload(
            $centre,
            [$studentA->id, $studentB->id],
        ))
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(ProgressGroupActivity::count())->toBe(1)
        ->and(ProgressRecord::whereNotNull('group_activity_id')->count())->toBe(2);
});

test('a group photo is visible to participants parents and their teachers only', function () {
    [$centre, $teacher, $parentA, $studentA, $parentB, $studentB] = groupProgressSetup();

    $this->actingAs($teacher)
        ->post(route('teacher.progress.group.store'), groupProgressPayload(
            $centre,
            [$studentA->id, $studentB->id],
            ['photo' => UploadedFile::fake()->image('group.jpg', 1200, 900)],
        ))
        ->assertSessionHasNoErrors();

    $photo = ProgressGroupPhoto::sole();
    $stranger = User::factory()->role(UserRole::Parent)->create();

    $this->actingAs($parentA)->get(route('progress.group-photos.show', $photo))->assertOk();
    $this->actingAs($parentB)->get(route('progress.group-photos.show', $photo))->assertOk();
    $this->actingAs($teacher)->get(route('progress.group-photos.show', $photo))->assertOk();
    $this->actingAs($stranger)->get(route('progress.group-photos.show', $photo))->assertForbidden();
});
