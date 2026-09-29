<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Centre;
use App\Models\Conversation;
use App\Models\Memo;
use App\Models\Student;
use App\Models\User;
use App\Notifications\AbsenceRequestedNotification;
use App\Notifications\MemoPostedNotification;
use App\Services\Messaging\ConversationService;
use Database\Seeders\CentreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

/**
 * Phase G3: a class key like "5tahun" exists at BOTH centres, so anything that
 * scoped only by class used to reach the other centre. These prove it no longer
 * does — the subtlest class of multi-centre bug.
 */
beforeEach(function () {
    $this->seed(CentreSeeder::class);
    $this->khalifah = Centre::where('code', 'khalifah-junior')->firstOrFail();
    $this->taska = Centre::where('code', 'taska-hikmah')->firstOrFail();
});

test('a class memo does not reach the other centre\'s same-named class', function () {
    Notification::fake();

    $admin = User::factory()->role(UserRole::Admin)->create();

    $parentA = User::factory()->role(UserRole::Parent)->create();
    $childA = Student::factory()->create([
        'parent_id' => $parentA->id, 'class' => '5tahun', 'centre_id' => $this->khalifah->id,
    ]);

    $parentB = User::factory()->role(UserRole::Parent)->create();
    Student::factory()->create([
        'parent_id' => $parentB->id, 'class' => '5tahun', 'centre_id' => $this->taska->id,
    ]);

    $this->actingAs($admin)->post(route('admin.memos.store'), [
        'title' => 'Khalifah 5 Tahun only',
        'description' => 'x',
        'audience' => 'class',
        'class' => '5tahun',
        'centre_id' => $this->khalifah->id,
    ])->assertRedirect();

    Notification::assertSentTo($parentA, MemoPostedNotification::class);
    Notification::assertNotSentTo($parentB, MemoPostedNotification::class);
});

test('a teacher only receives class memos for their own centre', function () {
    $admin = User::factory()->role(UserRole::Admin)->create();

    $teacherA = User::factory()->role(UserRole::Teacher)->create(['class' => '5tahun']);
    $teacherA->centres()->attach($this->khalifah->id);

    $teacherB = User::factory()->role(UserRole::Teacher)->create(['class' => '5tahun']);
    $teacherB->centres()->attach($this->taska->id);

    Memo::create([
        'author_id' => $admin->id,
        'title' => 'Khalifah notice',
        'description' => 'x',
        'audience' => 'class',
        'class' => '5tahun',
        'centre_id' => $this->khalifah->id,
    ]);

    $this->actingAs($teacherA)->get(route('teacher.memos.index'))
        ->assertInertia(fn ($page) => $page->has('memos', 1));

    $this->actingAs($teacherB)->get(route('teacher.memos.index'))
        ->assertInertia(fn ($page) => $page->has('memos', 0));
});

test('a parent absence only notifies teachers at that child\'s centre', function () {
    Notification::fake();

    $parent = User::factory()->role(UserRole::Parent)->create();
    $child = Student::factory()->create([
        'parent_id' => $parent->id, 'class' => '5tahun', 'centre_id' => $this->khalifah->id,
    ]);

    $teacherA = User::factory()->role(UserRole::Teacher)->create(['class' => '5tahun']);
    $teacherA->centres()->attach($this->khalifah->id);

    $teacherB = User::factory()->role(UserRole::Teacher)->create(['class' => '5tahun']);
    $teacherB->centres()->attach($this->taska->id);

    $this->actingAs($parent)->post(route('parent.absences.store', $child), [
        'start_date' => today()->addDay()->toDateString(),
        'end_date' => today()->addDays(2)->toDateString(),
        'type' => 'sick',
    ])->assertRedirect();

    Notification::assertSentTo($teacherA, AbsenceRequestedNotification::class);
    Notification::assertNotSentTo($teacherB, AbsenceRequestedNotification::class);
});

test('message fan-out reaches only the child\'s own centre', function () {
    $parent = User::factory()->role(UserRole::Parent)->create();
    $child = Student::factory()->create([
        'parent_id' => $parent->id, 'class' => '5tahun', 'centre_id' => $this->khalifah->id,
    ]);

    $teacherA = User::factory()->role(UserRole::Teacher)->create(['class' => '5tahun']);
    $teacherA->centres()->attach($this->khalifah->id);

    $teacherB = User::factory()->role(UserRole::Teacher)->create(['class' => '5tahun']);
    $teacherB->centres()->attach($this->taska->id);

    $conversation = Conversation::firstOrCreate(['student_id' => $child->id]);

    $recipients = app(ConversationService::class)->teachersFor($conversation);

    expect($recipients->pluck('id'))->toContain($teacherA->id)
        ->and($recipients->pluck('id'))->not->toContain($teacherB->id);
});

test('the attendance register never mixes centres', function () {
    $teacherA = User::factory()->role(UserRole::Teacher)->create(['class' => '5tahun']);
    $teacherA->centres()->attach($this->khalifah->id);

    $mine = Student::factory()->create(['class' => '5tahun', 'centre_id' => $this->khalifah->id]);
    Student::factory()->create(['class' => '5tahun', 'centre_id' => $this->taska->id]);

    $this->actingAs($teacherA)->get(route('teacher.attendance.index'))
        ->assertInertia(fn ($page) => $page
            ->has('students', 1)
            ->where('students.0.id', $mine->id)
        );
});

test('an admin can still see every centre', function () {
    $admin = User::factory()->role(UserRole::Admin)->create();

    Student::factory()->create(['class' => '5tahun', 'centre_id' => $this->khalifah->id]);
    Student::factory()->create(['class' => '5tahun', 'centre_id' => $this->taska->id]);

    $this->actingAs($admin)->get(route('admin.students.index'))
        ->assertInertia(fn ($page) => $page->has('students.data', 2));
});
