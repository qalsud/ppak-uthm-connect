<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Attendance;
use App\Models\AuthorisedCollector;
use App\Models\EmergencyContact;
use App\Models\Guardian;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('an admin can manage guardians, emergency contacts and collectors', function () {
    $admin = User::factory()->role(UserRole::Admin)->create();
    $student = Student::factory()->create();

    // Guardian
    $this->actingAs($admin)->post(route('admin.students.guardians.store', $student), [
        'name' => 'Nor Aisyah binti Omar',
        'relationship' => 'mother',
        'phone' => '0123456789',
        'is_primary' => true,
        'can_collect' => true,
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect($student->guardians()->count())->toBe(1)
        ->and($student->guardians()->first()->is_primary)->toBeTrue();

    // Emergency contact
    $this->actingAs($admin)->post(route('admin.students.contacts.store', $student), [
        'name' => 'Ahmad bin Ali',
        'relationship' => 'Grandparent',
        'phone' => '0198887777',
        'priority' => 2,
    ])->assertRedirect()->assertSessionHasNoErrors();

    // Authorised collector with a photo
    Storage::fake(config('media.disk'));

    $this->actingAs($admin)->post(route('admin.students.collectors.store', $student), [
        'name' => 'Siti binti Rahim',
        'relationship' => 'Aunt',
        'phone' => '0176665555',
        'photo' => UploadedFile::fake()->image('aunt.jpg', 300, 300),
    ])->assertRedirect()->assertSessionHasNoErrors();

    $collector = AuthorisedCollector::firstOrFail();

    expect($collector->photo_path)->not->toBeNull()
        ->and($collector->hasPhoto())->toBeTrue();

    // Deleting a collector clears its stored photo too.
    $this->actingAs($admin)->delete(route('admin.collectors.destroy', $collector))->assertRedirect();

    expect(AuthorisedCollector::count())->toBe(0);
});

test('only one guardian can be primary at a time', function () {
    $admin = User::factory()->role(UserRole::Admin)->create();
    $student = Student::factory()->create();

    $first = Guardian::create([
        'student_id' => $student->id,
        'name' => 'Father',
        'relationship' => 'father',
        'is_primary' => true,
    ]);

    $this->actingAs($admin)->post(route('admin.students.guardians.store', $student), [
        'name' => 'Mother',
        'relationship' => 'mother',
        'is_primary' => true,
    ])->assertRedirect();

    expect($first->fresh()->is_primary)->toBeFalse()
        ->and($student->guardians()->where('is_primary', true)->count())->toBe(1);
});

test('checkout requires an authorised collector and records the override path', function () {
    $parent = User::factory()->role(UserRole::Parent)->create();
    $teacher = User::factory()->role(UserRole::Teacher)->create();
    $student = Student::factory()->create(['parent_id' => $parent->id]);

    $guardian = Guardian::create([
        'student_id' => $student->id,
        'name' => 'Nor Aisyah binti Omar',
        'relationship' => 'mother',
        'can_collect' => true,
    ]);

    // No collector chosen -> blocked.
    $this->actingAs($teacher)->post(route('teacher.attendance.checkout', $student), [
        'photo' => UploadedFile::fake()->image('pickup.jpg'),
    ])->assertSessionHasErrors('collected_by');

    expect(Attendance::count())->toBe(0);

    // Choosing the listed guardian works and is recorded.
    $this->actingAs($teacher)->post(route('teacher.attendance.checkout', $student), [
        'photo' => UploadedFile::fake()->image('pickup.jpg'),
        'collected_by' => 'guardian-'.$guardian->id,
    ])->assertRedirect()->assertSessionHasNoErrors();

    $attendance = Attendance::firstOrFail();

    expect($attendance->collected_by)->toBe('guardian-'.$guardian->id)
        ->and($attendance->collector_override_reason)->toBeNull();
});

test('an unlisted collector is rejected without a reason, allowed with one', function () {
    Storage::fake(config('media.disk'));

    $parent = User::factory()->role(UserRole::Parent)->create();
    $teacher = User::factory()->role(UserRole::Teacher)->create();
    $student = Student::factory()->create(['parent_id' => $parent->id]);

    Guardian::create([
        'student_id' => $student->id,
        'name' => 'Nor Aisyah binti Omar',
        'relationship' => 'mother',
        'can_collect' => true,
    ]);

    $student->load(['guardians', 'authorisedCollectors']);

    // An id that is not on the authorised list.
    $this->actingAs($teacher)->post(route('teacher.attendance.checkout', $student), [
        'photo' => UploadedFile::fake()->image('pickup.jpg'),
        'collected_by' => 'collector-99999',
    ])->assertSessionHasErrors('collector_override');

    expect(Attendance::count())->toBe(0);

    // With a recorded reason the release goes through.
    $this->actingAs($teacher)->post(route('teacher.attendance.checkout', $student), [
        'photo' => UploadedFile::fake()->image('pickup.jpg'),
        'collected_by' => 'other',
        'collector_override' => 'Mother phoned ahead; uncle collecting.',
    ])->assertRedirect()->assertSessionHasNoErrors();

    $attendance = Attendance::firstOrFail();

    expect($attendance->collector_override_reason)->toBe('Mother phoned ahead; uncle collecting.');
});

test('the register lists authorised collectors for each child', function () {
    $parent = User::factory()->role(UserRole::Parent)->create();
    $teacher = User::factory()->role(UserRole::Teacher)->create(['class' => '5tahun']);
    $student = Student::factory()->create(['parent_id' => $parent->id, 'class' => '5tahun']);

    Guardian::create([
        'student_id' => $student->id,
        'name' => 'Nor Aisyah binti Omar',
        'relationship' => 'mother',
        'can_collect' => true,
    ]);

    // A guardian who may NOT collect must be excluded.
    Guardian::create([
        'student_id' => $student->id,
        'name' => 'Restricted Relative',
        'relationship' => 'other',
        'can_collect' => false,
    ]);

    AuthorisedCollector::create([
        'student_id' => $student->id,
        'name' => 'Siti binti Rahim',
        'relationship' => 'Aunt',
        'is_active' => true,
    ]);

    $this->actingAs($teacher)->get(route('teacher.attendance.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('students', 1)
            ->has('students.0.collectors', 2)
            ->where('students.0.collectors.0.name', 'Nor Aisyah binti Omar')
            ->where('students.0.collectors.1.name', 'Siti binti Rahim')
        );
});

test('the child contacts payload includes all three groups', function () {
    $admin = User::factory()->role(UserRole::Admin)->create();
    $student = Student::factory()->create();

    Guardian::create([
        'student_id' => $student->id,
        'name' => 'Father',
        'relationship' => 'father',
    ]);
    EmergencyContact::create([
        'student_id' => $student->id,
        'name' => 'Uncle',
        'phone' => '0123456789',
        'priority' => 1,
    ]);
    AuthorisedCollector::create([
        'student_id' => $student->id,
        'name' => 'Aunt',
    ]);

    $this->actingAs($admin)->get(route('admin.students.show', $student))
        ->assertInertia(fn (Assert $page) => $page
            ->has('contacts.guardians', 1)
            ->has('contacts.emergency_contacts', 1)
            ->has('contacts.collectors', 1)
            ->where('contacts.guardians.0.name', 'Father')
        );
});
