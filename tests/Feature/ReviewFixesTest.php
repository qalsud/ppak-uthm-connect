<?php

use App\Enums\UserRole;
use App\Models\Attendance;
use App\Models\Conversation;
use App\Models\DailyUpdate;
use App\Models\FinancialRecord;
use App\Models\Payment;
use App\Models\Student;
use App\Models\User;
use App\Notifications\MessageReceivedNotification;
use App\Services\Payments\PaymentCompletionService;

function reviewParent(): array
{
    $parent = User::factory()->role(UserRole::Parent)->create();
    $students = Student::factory()->count(2)->create(['parent_id' => $parent->id]);

    return [$parent, $students];
}

test('payment completion only marks the records covered by the session', function () {
    [$parent, $children] = reviewParent();
    $student = $children->first();

    $covered = FinancialRecord::create([
        'student_id' => $student->id,
        'month' => 'January',
        'amount' => 310.00,
        'status' => 'unpaid',
    ]);

    $notCovered = FinancialRecord::create([
        'student_id' => $student->id,
        'month' => 'February',
        'amount' => 310.00,
        'status' => 'unpaid',
    ]);

    $payment = Payment::create([
        'user_id' => $parent->id,
        'student_id' => $student->id,
        'amount' => 310.00,
        'financial_record_ids' => [$covered->id],
        'stripe_session_id' => 'cs_review_1',
        'status' => 'pending',
    ]);

    app(PaymentCompletionService::class)->complete($payment);

    expect($covered->fresh()->status)->toBe('paid');
    expect($notCovered->fresh()->status)->toBe('unpaid');

    // idempotent
    app(PaymentCompletionService::class)->complete($payment);
    expect($covered->fresh()->status)->toBe('paid');
});

test('message notification links to the recipient inbox', function () {
    [$parent, $children] = reviewParent();
    $teacher = User::factory()->role(UserRole::Teacher)->create();
    $conversation = Conversation::create(['student_id' => $children->first()->id, 'teacher_id' => $teacher->id]);

    $parentSends = new MessageReceivedNotification($conversation, $parent, 'hi');
    $teacherSends = new MessageReceivedNotification($conversation, $teacher, 'hello');

    expect($parentSends->url())->toBe(route('teacher.messages.index'));
    expect($teacherSends->url())->toBe(route('parent.messages.index'));
});

test('a parent can start a conversation and teachers are notified', function () {
    [$parent, $children] = reviewParent();
    $teacher = User::factory()->role(UserRole::Teacher)->create();

    $this->actingAs($parent)
        ->post(route('parent.messages.open', $children->first()))
        ->assertRedirect();

    $conversation = Conversation::first();
    expect($conversation)->not->toBeNull();
    expect($conversation->teacher_id)->toBeNull();

    $this->actingAs($parent)
        ->post(route('parent.messages.store', $conversation), ['body' => 'Hello teachers'])
        ->assertRedirect();

    expect($teacher->fresh()->notifications()->count())->toBeGreaterThanOrEqual(1);
});

test('a parent cannot open a conversation for another parent\'s child', function () {
    [$parent] = reviewParent();
    $otherStudent = Student::factory()->create();

    $this->actingAs($parent)
        ->post(route('parent.messages.open', $otherStudent))
        ->assertForbidden();
});

test('posting a memo notifies teachers as well as parents', function () {
    [$parent] = reviewParent();
    $teacher = User::factory()->role(UserRole::Teacher)->create();
    $admin = User::factory()->role(UserRole::Admin)->create();

    $this->actingAs($admin)->post(route('admin.memos.store'), [
        'title' => 'Holiday',
        'description' => 'School closed',
    ])->assertRedirect();

    expect($parent->fresh()->notifications()->count())->toBe(1);
    expect($teacher->fresh()->notifications()->count())->toBe(1);
});

test('submitting a daily update notifies teachers', function () {
    [$parent, $children] = reviewParent();
    $teacher = User::factory()->role(UserRole::Teacher)->create();

    $this->actingAs($parent)->post(route('parent.daily-update.store'), [
        'student_id' => $children->first()->id,
        'date' => today()->toDateString(),
        'arrival_time' => '07:30',
        'sleep_status' => 'Good',
        'bath_status' => 'Done',
    ])->assertRedirect();

    expect($teacher->fresh()->notifications()->count())->toBe(1);
});

test('daily updates and progress reject future dates', function () {
    [$parent, $children] = reviewParent();
    $teacher = User::factory()->role(UserRole::Teacher)->create();

    $future = today()->addDay()->toDateString();

    $this->actingAs($parent)->post(route('parent.daily-update.store'), [
        'student_id' => $children->first()->id,
        'date' => $future,
        'arrival_time' => '07:30',
        'sleep_status' => 'Good',
        'bath_status' => 'Done',
    ])->assertSessionHasErrors('date');

    $this->actingAs($teacher)->post(route('teacher.progress.store'), [
        'student_id' => $children->first()->id,
        'date' => $future,
        'activity_done' => 'Good',
        'child_proficiency' => 'Good',
        'permata_activity' => 'Drawing',
        'free_activity' => 'Learning',
        'development_proficiency' => 'Social Skills',
    ])->assertSessionHasErrors('date');
});

test('daily update accepts HH:MM:SS and can be re-submitted the same day', function () {
    [$parent, $children] = reviewParent();
    $student = $children->first();

    // First submit with seconds should be normalised to HH:MM.
    $this->actingAs($parent)->post(route('parent.daily-update.store'), [
        'student_id' => $student->id,
        'date' => today()->toDateString(),
        'arrival_time' => '07:30:00',
        'sleep_status' => 'Good',
        'bath_status' => 'Done',
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect(DailyUpdate::where('student_id', $student->id)->first()->arrival_time)->toBe('07:30');

    // Re-submitting the same child/date must update, not fail on the unique index.
    $this->actingAs($parent)->post(route('parent.daily-update.store'), [
        'student_id' => $student->id,
        'date' => today()->toDateString(),
        'arrival_time' => '08:05',
        'sleep_status' => 'Poor',
        'bath_status' => 'Not Done',
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect(DailyUpdate::where('student_id', $student->id)->count())->toBe(1);
    expect(DailyUpdate::where('student_id', $student->id)->first()->arrival_time)->toBe('08:05');
});

test('a parent can only view their own child detail page', function () {
    [$parent, $children] = reviewParent();

    $this->actingAs($parent)->get(route('parent.children.show', $children->first()))->assertOk();

    $other = Student::factory()->create();
    $this->actingAs($parent)->get(route('parent.children.show', $other))->assertForbidden();
});

test('progress cannot be saved with placeholder Select values', function () {
    [$parent, $children] = reviewParent();
    $teacher = User::factory()->role(UserRole::Teacher)->create();

    $this->actingAs($teacher)->post(route('teacher.progress.store'), [
        'student_id' => $children->first()->id,
        'date' => today()->toDateString(),
        'sub_theme' => 'outdoor',
        'activity_done' => 'Select',
        'child_proficiency' => 'Good',
        'permata_activity' => 'Drawing',
        'free_activity' => 'Learning',
        'development_proficiency' => 'Social Skills',
    ])->assertSessionHasErrors('activity_done');
});

test('a parent marks attendance and a teacher can override it', function () {
    [$parent, $children] = reviewParent();
    $child = $children->first();

    $this->actingAs($parent)
        ->post(route('parent.attendance.store', $child), ['action' => 'arrive'])
        ->assertRedirect();

    $record = Attendance::where('student_id', $child->id)->first();
    expect($record)->not->toBeNull()
        ->and($record->status())->toBe('school');

    $teacher = User::factory()->role(UserRole::Teacher)->create();
    $this->actingAs($teacher)
        ->post(route('teacher.attendance.store', $child), ['action' => 'depart'])
        ->assertRedirect();

    expect(Attendance::where('student_id', $child->id)->first()->status())->toBe('home');
});

test('attendance is scoped to the parent\'s children and keeps one row per day', function () {
    [$parent, $children] = reviewParent();
    $child = $children->first();

    $other = Student::factory()->create();
    $this->actingAs($parent)
        ->post(route('parent.attendance.store', $other), ['action' => 'arrive'])
        ->assertForbidden();

    $this->actingAs($parent)->post(route('parent.attendance.store', $child), ['action' => 'arrive']);
    $this->actingAs($parent)->post(route('parent.attendance.store', $child), ['action' => 'depart']);

    expect(Attendance::where('student_id', $child->id)->count())->toBe(1);
});
