<?php

use App\Enums\UserRole;
use App\Models\Conversation;
use App\Models\FinancialRecord;
use App\Models\Payment;
use App\Models\Student;
use App\Models\User;
use App\Services\Payments\PaymentCompletionService;
use App\Services\Payments\StripeCheckoutService;

function paymentParent(): array
{
    $parent = User::factory()->role(UserRole::Parent)->create();
    $student = Student::factory()->create(['parent_id' => $parent->id]);
    FinancialRecord::create([
        'student_id' => $student->id,
        'month' => 'January',
        'amount' => 310.00,
        'status' => 'unpaid',
    ]);

    return [$parent, $student];
}

test('parent checkout creates a pending payment and redirects to stripe', function () {
    [$parent, $student] = paymentParent();

    config(['services.stripe.secret_key' => 'sk_test_x']);
    config(['services.stripe.publishable_key' => 'pk_test_x']);

    $this->app->instance(StripeCheckoutService::class, new class extends StripeCheckoutService
    {
        public function isConfigured(): bool
        {
            return true;
        }

        public function createSession(Payment $payment, User $parent, Student $student): array
        {
            return ['id' => 'cs_test_abc', 'url' => 'https://checkout.stripe.test'];
        }
    });

    $this->actingAs($parent)
        ->post(route('parent.payments.checkout'), ['student_id' => $student->id])
        ->assertRedirect('https://checkout.stripe.test');

    $this->assertDatabaseHas('payments', [
        'user_id' => $parent->id,
        'student_id' => $student->id,
        'amount' => '310.00',
        'status' => 'pending',
    ]);
});

test('parent checkout reports when stripe is not configured', function () {
    [$parent, $student] = paymentParent();
    config(['services.stripe.secret_key' => null]);
    config(['services.stripe.publishable_key' => null]);

    $this->actingAs($parent)
        ->post(route('parent.payments.checkout'), ['student_id' => $student->id])
        ->assertRedirect()
        ->assertSessionHas('error');
});

test('completing a checkout session marks unpaid records paid and is idempotent', function () {
    [$parent, $student] = paymentParent();

    $payment = Payment::create([
        'user_id' => $parent->id,
        'student_id' => $student->id,
        'amount' => 310.00,
        'stripe_session_id' => 'cs_test_123',
        'status' => 'pending',
    ]);

    app(PaymentCompletionService::class)->markSessionCompleted('cs_test_123');

    expect($payment->fresh()->status)->toBe('paid');
    expect($student->financialRecords()->where('status', 'paid')->count())->toBe(1);

    // Running it again must not double-mark or error.
    app(PaymentCompletionService::class)->markSessionCompleted('cs_test_123');

    expect($student->financialRecords()->where('status', 'paid')->count())->toBe(1);
});

test('teacher and parent can exchange messages in a conversation', function () {
    $teacher = User::factory()->role(UserRole::Teacher)->create();
    [$parent, $student] = paymentParent();

    $this->actingAs($teacher)->post(route('teacher.messages.open', $student))->assertRedirect();

    $conversation = Conversation::first();
    expect($conversation)->not->toBeNull();

    $this->actingAs($teacher)
        ->post(route('teacher.messages.store', $conversation), ['body' => 'Hi there'])
        ->assertRedirect();

    expect($conversation->messages()->count())->toBe(1);

    $this->actingAs($parent)->get(route('parent.messages.show', $conversation))->assertOk();

    $this->actingAs($parent)
        ->post(route('parent.messages.store', $conversation), ['body' => 'Hello teacher'])
        ->assertRedirect();

    expect($conversation->messages()->count())->toBe(2);
});

test('a parent cannot read or message another parent’s conversation', function () {
    [$parent, $student] = paymentParent();
    $other = User::factory()->role(UserRole::Parent)->create();

    $conversation = Conversation::create(['student_id' => $student->id]);

    $this->actingAs($other)->get(route('parent.messages.show', $conversation))->assertForbidden();
    $this->actingAs($other)
        ->post(route('parent.messages.store', $conversation), ['body' => 'nope'])
        ->assertForbidden();
});

test('memo posts and activity records create notifications for parents', function () {
    [$parent, $student] = paymentParent();
    $admin = User::factory()->role(UserRole::Admin)->create();
    $teacher = User::factory()->role(UserRole::Teacher)->create();

    $this->actingAs($admin)->post(route('admin.memos.store'), [
        'title' => 'Perjumpaan',
        'description' => 'Sabtu ini',
    ])->assertRedirect();

    expect($parent->notifications()->count())->toBe(1);

    $this->actingAs($teacher)->post(route('teacher.activities.store'), [
        'student_id' => $student->id,
        'date' => today()->toDateString(),
        'statuses' => ['breakfast' => 'yes'],
    ])->assertRedirect();

    expect($parent->notifications()->count())->toBeGreaterThanOrEqual(2);
});

test('notifications endpoint returns unread count and list', function () {
    [$parent] = paymentParent();

    $response = $this->actingAs($parent)->getJson(route('notifications.index'));

    $response->assertOk()->assertJsonStructure(['count', 'data']);
});
