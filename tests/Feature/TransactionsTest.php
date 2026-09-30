<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\FinancialRecord;
use App\Models\Payment;
use App\Models\Student;
use App\Models\User;
use App\Services\Payments\StripeCheckoutService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function transactionsAdmin(): User
{
    return User::factory()->role(UserRole::Admin)->create();
}

/** A paid payment covering one paid fee record. */
function paidPayment(): array
{
    $parent = User::factory()->role(UserRole::Parent)->create();
    $student = Student::factory()->create(['parent_id' => $parent->id]);

    $record = FinancialRecord::create([
        'student_id' => $student->id,
        'month' => 'June',
        'amount' => 300,
        'overtime_hours' => 0,
        'status' => 'paid',
        'paid_on' => now(),
    ]);

    $payment = Payment::create([
        'user_id' => $parent->id,
        'student_id' => $student->id,
        'amount' => 300,
        'financial_record_ids' => [$record->id],
        'stripe_session_id' => 'cs_test_1',
        'status' => 'paid',
        'paid_at' => now(),
    ]);

    return [$payment, $record];
}

test('an admin can refund a completed payment', function () {
    [$payment, $record] = paidPayment();

    $this->mock(StripeCheckoutService::class, function ($mock) {
        $mock->shouldReceive('isConfigured')->andReturn(true);
        $mock->shouldReceive('refund')->once()->andReturn('re_test_1');
    });

    $this->actingAs(transactionsAdmin())
        ->post(route('admin.transactions.refund', $payment), ['reason' => 'Duplicate charge'])
        ->assertRedirect()->assertSessionHasNoErrors();

    expect($payment->fresh()->status)->toBe('refunded')
        ->and($payment->fresh()->refund_id)->toBe('re_test_1')
        ->and((float) $payment->fresh()->refunded_amount)->toBe(300.0)
        // The fee is owed again.
        ->and($record->fresh()->status)->toBe('unpaid')
        ->and($record->fresh()->paid_on)->toBeNull();
});

test('a refund needs Stripe to be configured', function () {
    [$payment] = paidPayment();

    $this->mock(StripeCheckoutService::class, function ($mock) {
        $mock->shouldReceive('isConfigured')->andReturn(false);
    });

    $this->actingAs(transactionsAdmin())
        ->post(route('admin.transactions.refund', $payment))
        ->assertRedirect()
        ->assertSessionHas('error', __('payments.refund_unavailable'));

    expect($payment->fresh()->status)->toBe('paid');
});

test('only a completed payment can be refunded', function () {
    [$payment] = paidPayment();
    $payment->update(['status' => 'pending']);

    $this->actingAs(transactionsAdmin())
        ->post(route('admin.transactions.refund', $payment))
        ->assertSessionHas('error', __('payments.not_refundable'));

    expect($payment->fresh()->status)->toBe('pending');
});

test('the transactions page renders', function () {
    paidPayment();

    $this->actingAs(transactionsAdmin())
        ->get(route('admin.transactions.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Transactions')
            ->has('payments.data', 1)
            ->has('signals.collected')
        );
});

test('a non-admin cannot refund', function () {
    [$payment] = paidPayment();

    $this->actingAs(User::factory()->role(UserRole::Teacher)->create())
        ->post(route('admin.transactions.refund', $payment))
        ->assertForbidden();

    expect($payment->fresh()->status)->toBe('paid');
});
