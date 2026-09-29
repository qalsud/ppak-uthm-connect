<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\AbsenceRequest;
use App\Models\Attendance;
use App\Models\Conversation;
use App\Models\GrowthRecord;
use App\Models\MedicationRequest;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

/**
 * Phase A: an admin can perform every teacher action from the admin side.
 * These reuse the teacher controllers via the `admin.register.*` routes.
 */
function adminUser(): User
{
    return User::factory()->role(UserRole::Admin)->create();
}

test('an admin can open the attendance register and it renders the admin shell', function () {
    $student = Student::factory()->create(['class' => '5tahun']);

    $this->actingAs(adminUser())
        ->get(route('admin.register.attendance'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Teacher/Attendance')
            ->where('shell', 'admin')
            ->has('students', 1)
        );
});

test('an admin can mark arrival, mark-all and check a child out', function () {
    Storage::fake(config('media.disk'));

    $admin = adminUser();
    $parent = User::factory()->role(UserRole::Parent)->create();
    $child = Student::factory()->create(['parent_id' => $parent->id, 'class' => '5tahun']);
    $other = Student::factory()->create(['class' => '5tahun']);

    // Single arrival
    $this->actingAs($admin)->post(route('admin.register.attendance.store', $child), [
        'action' => 'arrive',
        'temperature' => '36.8',
    ])->assertRedirect();

    expect(Attendance::where('student_id', $child->id)->first()?->arrived_at)->not->toBeNull();

    // Mark the rest of the class present
    $this->actingAs($admin)->post(route('admin.register.attendance.mark-all'), [
        'class' => '5tahun',
    ])->assertRedirect();

    expect(Attendance::where('student_id', $other->id)->first()?->arrived_at)->not->toBeNull();

    // Check out, using the override path so no collector record is needed
    $this->actingAs($admin)->post(route('admin.register.attendance.checkout', $child), [
        'photo' => UploadedFile::fake()->image('pickup.jpg'),
        'collected_by' => 'other',
        'collector_override' => 'Admin recorded at the gate',
    ])->assertRedirect();

    expect(Attendance::where('student_id', $child->id)->first()->status())->toBe('home');
});

test('an admin can approve an absence and administer medication', function () {
    $admin = adminUser();
    $parent = User::factory()->role(UserRole::Parent)->create();
    $child = Student::factory()->create(['parent_id' => $parent->id]);

    $absence = AbsenceRequest::create([
        'student_id' => $child->id,
        'requested_by' => $parent->id,
        'start_date' => today()->addDay()->toDateString(),
        'end_date' => today()->addDays(2)->toDateString(),
        'type' => 'sick',
        'status' => 'pending',
    ]);

    $this->actingAs($admin)
        ->post(route('admin.register.absences.update', $absence), ['status' => 'approved'])
        ->assertRedirect();

    expect($absence->fresh()->status)->toBe('approved')
        ->and($absence->fresh()->reviewed_by)->toBe($admin->id);

    $medication = MedicationRequest::create([
        'student_id' => $child->id,
        'requested_by' => $parent->id,
        'date' => today()->toDateString(),
        'medicine' => 'Paracetamol',
        'status' => 'pending',
    ]);

    $this->actingAs($admin)
        ->post(route('admin.register.medications.update', $medication), ['status' => 'given'])
        ->assertRedirect();

    expect($medication->fresh()->status)->toBe('given')
        ->and($medication->fresh()->given_by)->toBe($admin->id);
});

test('an admin can record growth, activities and progress for any child', function () {
    $admin = adminUser();
    $child = Student::factory()->create(['class' => '6bintang']);

    $this->actingAs($admin)->post(route('admin.register.growth.store'), [
        'student_id' => $child->id,
        'date' => today()->toDateString(),
        'height_cm' => 112.5,
        'weight_kg' => 19.0,
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect(GrowthRecord::where('student_id', $child->id)->exists())->toBeTrue();

    // Activities + progress screens render in the admin shell.
    $this->actingAs($admin)->get(route('admin.register.activities.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Teacher/Activities')->where('shell', 'admin'));

    $this->actingAs($admin)->get(route('admin.register.progress.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Teacher/Progress')->where('shell', 'admin'));

    $this->actingAs($admin)->get(route('admin.register.growth.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Teacher/Growth')->where('shell', 'admin'));

    $this->actingAs($admin)->get(route('admin.register.daily-updates.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Teacher/DailyUpdates')->where('shell', 'admin'));
});

test('a teacher sees the teacher shell and cannot reach the admin register', function () {
    $teacher = User::factory()->role(UserRole::Teacher)->create(['class' => '5tahun']);
    Student::factory()->create(['class' => '5tahun']);

    $this->actingAs($teacher)
        ->get(route('teacher.attendance.index'))
        ->assertInertia(fn (Assert $page) => $page->where('shell', 'teacher'));

    // The admin register is admin-only.
    $this->actingAs($teacher)
        ->get(route('admin.register.attendance'))
        ->assertForbidden();
});

test('a parent cannot reach the admin register', function () {
    $parent = User::factory()->role(UserRole::Parent)->create();

    $this->actingAs($parent)
        ->get(route('admin.register.attendance'))
        ->assertForbidden();
});

test('an admin can send a message in a conversation', function () {
    $admin = adminUser();
    $parent = User::factory()->role(UserRole::Parent)->create();
    $child = Student::factory()->create(['parent_id' => $parent->id]);

    $conversation = Conversation::firstOrCreate(['student_id' => $child->id]);

    $this->actingAs($admin)
        ->post(route('admin.register.messages.store', $conversation), ['body' => 'Notice from the office'])
        ->assertRedirect();

    $message = $conversation->messages()->latest('id')->first();

    expect($message)->not->toBeNull()
        ->and($message->body)->toBe('Notice from the office')
        ->and($message->sender_id)->toBe($admin->id);

    // The admin chat screen renders and lists the thread.
    $this->actingAs($admin)->get(route('admin.register.messages.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Teacher/Messages')->where('shell', 'admin'));
});
