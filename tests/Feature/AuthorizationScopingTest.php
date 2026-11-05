<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Attendance;
use App\Models\AttendancePhoto;
use App\Models\Centre;
use App\Models\Conversation;
use App\Models\DailyActivity;
use App\Models\DailyUpdate;
use App\Models\Memo;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\CentreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

/** A teacher assigned to one centre (and optionally one class). */
function scopedTeacher(int $centreId, ?string $class = '5tahun'): User
{
    $teacher = User::factory()->role(UserRole::Teacher)->create(['class' => $class]);
    $teacher->centres()->attach($centreId);

    return $teacher;
}

beforeEach(function () {
    $this->seed(CentreSeeder::class);
    $this->khalifah = Centre::where('code', 'khalifah-junior')->firstOrFail();
    $this->taska = Centre::where('code', 'taska-hikmah')->firstOrFail();

    Storage::fake('attendance');
    config()->set('media.disk', 'attendance');
});

test('teachers cannot view media for a child outside their centre or class', function () {
    $parent = User::factory()->role(UserRole::Parent)->create();
    $student = Student::factory()->create([
        'parent_id' => $parent->id,
        'class' => '5tahun',
        'centre_id' => $this->khalifah->id,
    ]);

    $attendance = Attendance::create(['student_id' => $student->id, 'date' => today()]);
    Storage::disk('attendance')->put('photos/checkout.jpg', 'fake-image');

    $photo = AttendancePhoto::create([
        'attendance_id' => $attendance->id,
        'student_id' => $student->id,
        'type' => 'checkout',
        'disk' => 'attendance',
        'path' => 'photos/checkout.jpg',
        'mime' => 'image/jpeg',
    ]);

    $ownTeacher = scopedTeacher($this->khalifah->id, '5tahun');
    $otherCentre = scopedTeacher($this->taska->id, '5tahun');
    $otherClass = scopedTeacher($this->khalifah->id, '6bintang');

    $this->actingAs($ownTeacher)->get(route('attendance.photos.show', $photo))->assertOk();
    $this->actingAs($parent)->get(route('attendance.photos.show', $photo))->assertOk();

    $this->actingAs($otherCentre)->get(route('attendance.photos.show', $photo))->assertForbidden();
    $this->actingAs($otherClass)->get(route('attendance.photos.show', $photo))->assertForbidden();
});

test('a teacher inbox is scoped to their centre and class', function () {
    $teacher = scopedTeacher($this->khalifah->id, '5tahun');

    $mine = Student::factory()->create([
        'parent_id' => User::factory()->role(UserRole::Parent)->create()->id,
        'class' => '5tahun',
        'centre_id' => $this->khalifah->id,
    ]);
    $other = Student::factory()->create([
        'parent_id' => User::factory()->role(UserRole::Parent)->create()->id,
        'class' => '5tahun',
        'centre_id' => $this->taska->id,
    ]);

    Conversation::create(['student_id' => $mine->id]);
    Conversation::create(['student_id' => $other->id]);

    $this->actingAs($teacher)
        ->get(route('teacher.messages.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('conversations', 1)
            ->where('conversations.0.student', $mine->name)
        );
});

test('message search is scoped to the teacher centre', function () {
    $teacher = scopedTeacher($this->khalifah->id, '5tahun');

    $mine = Student::factory()->create(['class' => '5tahun', 'centre_id' => $this->khalifah->id]);
    $other = Student::factory()->create(['class' => '5tahun', 'centre_id' => $this->taska->id]);

    $mineConversation = Conversation::create(['student_id' => $mine->id]);
    $otherConversation = Conversation::create(['student_id' => $other->id]);

    $mineConversation->messages()->create([
        'sender_id' => $teacher->id,
        'type' => 'user',
        'body' => 'needle from my class',
    ]);
    $otherConversation->messages()->create([
        'sender_id' => $teacher->id,
        'type' => 'user',
        'body' => 'needle from the other centre',
    ]);

    $this->actingAs($teacher)
        ->getJson(route('messages.search', ['q' => 'needle']))
        ->assertOk()
        ->assertJsonCount(1, 'results')
        ->assertJsonPath('results.0.student', $mine->name);
});

test('global search respects centre and memo visibility', function () {
    $teacher = scopedTeacher($this->khalifah->id, '5tahun');

    Student::factory()->create([
        'name' => 'Aisyah Mine',
        'class' => '5tahun',
        'centre_id' => $this->khalifah->id,
    ]);
    Student::factory()->create([
        'name' => 'Aisyah Other',
        'class' => '5tahun',
        'centre_id' => $this->taska->id,
    ]);

    Memo::create([
        'author_id' => $teacher->id,
        'title' => 'Aisyah teachers memo',
        'description' => 'Visible',
        'audience' => 'teachers',
        'centre_id' => $this->khalifah->id,
    ]);
    Memo::create([
        'author_id' => $teacher->id,
        'title' => 'Aisyah parents memo',
        'description' => 'Not for teachers',
        'audience' => 'parents',
        'centre_id' => $this->khalifah->id,
    ]);
    Memo::create([
        'author_id' => $teacher->id,
        'title' => 'Aisyah other centre memo',
        'description' => 'Other centre',
        'audience' => 'teachers',
        'centre_id' => $this->taska->id,
    ]);

    $this->actingAs($teacher)
        ->getJson(route('search', ['q' => 'Aisyah']))
        ->assertOk()
        ->assertJsonCount(1, 'groups.0.items')
        ->assertJsonPath('groups.0.items.0.label', 'Aisyah Mine')
        ->assertJsonCount(1, 'groups.1.items')
        ->assertJsonPath('groups.1.items.0.label', 'Aisyah teachers memo');
});

test('parent memos are centre scoped in the list and dashboard count', function () {
    $parent = User::factory()->role(UserRole::Parent)->create();
    Student::factory()->create([
        'parent_id' => $parent->id,
        'class' => '5tahun',
        'centre_id' => $this->khalifah->id,
    ]);

    $author = User::factory()->role(UserRole::Admin)->create();

    $visible = Memo::create([
        'author_id' => $author->id,
        'title' => 'My centre class memo',
        'description' => 'Visible',
        'audience' => 'class',
        'class' => '5tahun',
        'centre_id' => $this->khalifah->id,
    ]);
    $visible->forceFill(['created_at' => now()])->save();

    Memo::create([
        'author_id' => $author->id,
        'title' => 'Other centre class memo',
        'description' => 'Wrong centre',
        'audience' => 'class',
        'class' => '5tahun',
        'centre_id' => $this->taska->id,
    ]);
    Memo::create([
        'author_id' => $author->id,
        'title' => 'Other centre parents memo',
        'description' => 'Wrong centre',
        'audience' => 'parents',
        'centre_id' => $this->taska->id,
    ]);

    $everyone = Memo::create([
        'author_id' => $author->id,
        'title' => 'Everyone memo',
        'description' => 'Visible',
        'audience' => 'all',
    ]);
    $everyone->forceFill(['created_at' => now()->subMinute()])->save();

    $this->actingAs($parent)
        ->get(route('parent.memos.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('memos', 2)
            ->where('memos.0.title', 'My centre class memo')
            ->where('memos.1.title', 'Everyone memo')
        );

    $this->actingAs($parent)
        ->get(route('parent.dashboard'))
        ->assertInertia(fn (Assert $page) => $page->where('memoCount', 2));
});

test('teacher dashboard only shows activities and updates for visible students', function () {
    $teacher = scopedTeacher($this->khalifah->id, '5tahun');

    $mine = Student::factory()->create(['class' => '5tahun', 'centre_id' => $this->khalifah->id]);
    $other = Student::factory()->create(['class' => '5tahun', 'centre_id' => $this->taska->id]);

    DailyActivity::create([
        'student_id' => $mine->id,
        'teacher_id' => $teacher->id,
        'date' => today()->toDateString(),
        'lunch' => 'yes',
    ]);
    DailyActivity::create([
        'student_id' => $other->id,
        'teacher_id' => $teacher->id,
        'date' => today()->toDateString(),
        'lunch' => 'yes',
    ]);

    DailyUpdate::create(['student_id' => $mine->id, 'date' => today()->toDateString()]);
    DailyUpdate::create(['student_id' => $other->id, 'date' => today()->toDateString()]);

    $this->actingAs($teacher)
        ->get(route('teacher.dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('recentActivities', 1)
            ->where('recentActivities.0.student', $mine->name)
            ->where('activityCount', 1)
            ->where('updateCount', 1)
        );
});
