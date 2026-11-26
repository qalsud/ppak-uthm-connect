<?php

use App\Enums\UserRole;
use App\Models\MedicationRequest;
use App\Models\Student;
use App\Models\User;
use App\Notifications\FeeReminderNotification;
use App\Notifications\MedicationRequestedNotification;
use App\Notifications\ProgressRecordedNotification;
use App\Notifications\StudentMarkedAbsentNotification;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

function notificationUser(): User
{
    return User::factory()->role(UserRole::Parent)->create();
}

function makeNotification(
    User $user,
    string $category = 'system',
    bool $read = false,
    ?string $createdAt = null,
): DatabaseNotification {
    $notification = $user->notifications()->create([
        'id' => (string) Str::uuid(),
        'type' => 'App\\Notifications\\ProgressRecordedNotification',
        'data' => [
            'title' => ucfirst($category).' notice',
            'body' => 'Something happened.',
            'url' => '/notifications',
            'category' => $category,
            'priority' => 'normal',
        ],
        'read_at' => $read ? now() : null,
    ]);

    if ($createdAt) {
        $notification->forceFill(['created_at' => $createdAt])->save();
    }

    return $notification;
}

test('the notification centre only lists the current user notifications', function () {
    $user = notificationUser();
    $other = notificationUser();

    makeNotification($user, 'fees');
    makeNotification($user, 'attendance');
    makeNotification($other, 'messages');

    $this->actingAs($user)
        ->get('/notifications')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Notifications')
            ->has('notifications.data', 2)
            ->where('filters.category', null)
            ->where('filters.unread', false)
            ->where('unreadCount', 2)
            ->where('categories.5.value', 'fees')
            ->where('categories.5.unread', 1));
});

test('notifications can be filtered by category and unread state', function () {
    $user = notificationUser();

    makeNotification($user, 'fees');
    makeNotification($user, 'fees', read: true);
    makeNotification($user, 'attendance');

    $this->actingAs($user)
        ->get('/notifications?category=fees')
        ->assertInertia(fn (Assert $page) => $page->has('notifications.data', 2));

    $this->actingAs($user)
        ->get('/notifications?category=fees&unread=1')
        ->assertInertia(fn (Assert $page) => $page->has('notifications.data', 1));

    $this->actingAs($user)
        ->get('/notifications?unread=1')
        ->assertInertia(fn (Assert $page) => $page->has('notifications.data', 2));
});

test('a notification can be marked read, unread and deleted individually', function () {
    $user = notificationUser();
    $notification = makeNotification($user, 'fees');
    $untouched = makeNotification($user, 'fees');

    $this->actingAs($user)
        ->postJson("/notifications/{$notification->id}/read")
        ->assertOk()
        ->assertJson(['count' => 1]);

    expect($notification->fresh()->read_at)->not->toBeNull();
    expect($untouched->fresh()->read_at)->toBeNull();

    $this->actingAs($user)
        ->postJson("/notifications/{$notification->id}/unread")
        ->assertOk()
        ->assertJson(['count' => 2]);

    expect($notification->fresh()->read_at)->toBeNull();

    $this->actingAs($user)
        ->deleteJson("/notifications/{$notification->id}")
        ->assertOk()
        ->assertJson(['count' => 1]);

    expect(DatabaseNotification::find($notification->id))->toBeNull();
});

test('a user cannot touch another user notification', function () {
    $user = notificationUser();
    $other = notificationUser();
    $notification = makeNotification($other);

    $this->actingAs($user)
        ->postJson("/notifications/{$notification->id}/read")
        ->assertNotFound();

    $this->actingAs($user)
        ->deleteJson("/notifications/{$notification->id}")
        ->assertNotFound();

    expect($notification->fresh())->not->toBeNull();
});

test('read all only marks the current user notifications', function () {
    $user = notificationUser();
    $other = notificationUser();

    makeNotification($user);
    makeNotification($user);
    makeNotification($other);

    $this->actingAs($user)->postJson('/notifications/read-all')->assertOk();

    expect($user->fresh()->unreadNotifications()->count())->toBe(0)
        ->and($other->fresh()->unreadNotifications()->count())->toBe(1);
});

test('the bell feed returns the six latest notifications and unread count', function () {
    $user = notificationUser();

    for ($i = 0; $i < 8; $i++) {
        makeNotification($user, 'fees', createdAt: now()->subMinutes(8 - $i)->toDateTimeString());
    }

    $this->actingAs($user)
        ->getJson('/notifications/feed')
        ->assertOk()
        ->assertJsonCount(6, 'data')
        ->assertJsonPath('count', 8)
        ->assertJsonPath('data.0.data.title', 'Fees notice');
});

test('high signal categories email by default and can be opted out', function () {
    $user = notificationUser();
    $student = Student::factory()->create(['parent_id' => $user->id]);

    $fee = new FeeReminderNotification(100, 2);
    $progress = new ProgressRecordedNotification($student);

    expect($fee->via($user))->toContain('mail')
        ->and($progress->via($user))->not->toContain('mail');

    $user->notification_preferences = ['fees' => false, 'progress' => true];

    expect($fee->via($user))->not->toContain('mail')
        ->and($progress->via($user))->toContain('mail');
});

test('a user can save per-category email preferences', function () {
    $user = notificationUser();

    $this->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => $user->email,
            'notification_preferences' => [
                'messages' => true,
                'fees' => false,
            ],
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $user->refresh();

    expect($user->notification_preferences)->toMatchArray([
        'messages' => true,
        'fees' => false,
    ])->and($user->notify_email_messages)->toBeTrue();
});

test('a medication request notifies the child teachers', function () {
    Notification::fake();

    $parent = notificationUser();
    $student = Student::factory()->create(['parent_id' => $parent->id]);
    $teacher = User::factory()->role(UserRole::Teacher)->create();

    $this->actingAs($parent)
        ->post(route('parent.medications.store', $student), [
            'date' => today()->toDateString(),
            'medicine' => 'Paracetamol',
            'time_due' => '12:30',
        ])
        ->assertRedirect();

    Notification::assertSentTo(
        $teacher,
        MedicationRequestedNotification::class,
        fn (MedicationRequestedNotification $notification) => $notification->category() === 'medication',
    );

    expect(MedicationRequest::firstOrFail()->medicine)->toBe('Paracetamol');
});

test('marking a child absent notifies the parent', function () {
    Notification::fake();

    $parent = notificationUser();
    $student = Student::factory()->create(['parent_id' => $parent->id]);
    $teacher = User::factory()->role(UserRole::Teacher)->create();

    $this->actingAs($teacher)
        ->post(route('teacher.attendance.absent', $student), [
            'absence_type' => 'sick',
            'absence_note' => 'Fever',
        ])
        ->assertRedirect();

    Notification::assertSentTo(
        $parent,
        StudentMarkedAbsentNotification::class,
        fn (StudentMarkedAbsentNotification $notification) => $notification->studentId() === $student->id,
    );
});
