<?php

use App\Enums\UserRole;
use App\Models\FinancialRecord;
use App\Models\Student;
use App\Models\User;
use App\Notifications\FeeReminderNotification;
use Illuminate\Support\Facades\Notification;

test('fee reminders are sent once per parent per day', function () {
    Notification::fake();

    $parent = User::factory()->role(UserRole::Parent)->create();
    $student = Student::factory()->create(['parent_id' => $parent->id]);

    FinancialRecord::create([
        'student_id' => $student->id,
        'month' => 'July',
        'amount' => 300,
        'overtime_hours' => 0,
        'status' => 'unpaid',
        'due_on' => today()->addDay(),
    ]);

    $this->artisan('fees:send-reminders')->assertSuccessful();
    $this->artisan('fees:send-reminders')->assertSuccessful();

    Notification::assertSentToTimes($parent, FeeReminderNotification::class, 1);
});
