<?php

use App\Enums\UserRole;
use App\Models\Payment;
use App\Models\Student;
use App\Models\User;
use App\Notifications\PaymentCompletedNotification;
use App\Services\Payments\PaymentCompletionService;
use Illuminate\Support\Facades\Notification;

test('a stale payment model cannot complete twice or notify twice', function () {
    Notification::fake();

    $parent = User::factory()->role(UserRole::Parent)->create();
    $student = Student::factory()->create(['parent_id' => $parent->id]);

    $payment = Payment::create([
        'user_id' => $parent->id,
        'student_id' => $student->id,
        'amount' => 300,
        'financial_record_ids' => [],
        'status' => 'pending',
    ]);

    // The webhook and the success page can both hold a model that still says
    // pending when the other request completes the payment first.
    $stale = Payment::query()->findOrFail($payment->id);

    $service = app(PaymentCompletionService::class);
    $service->complete($payment);
    $service->complete($stale);

    Notification::assertSentToTimes($parent, PaymentCompletedNotification::class, 1);
    expect($payment->fresh()->status)->toBe('paid');
});
