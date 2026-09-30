<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Centre;
use App\Models\FeeSetting;
use App\Models\FinancialRecord;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\CentreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(CentreSeeder::class);
    $this->khalifah = Centre::where('code', 'khalifah-junior')->firstOrFail();
    $this->taska = Centre::where('code', 'taska-hikmah')->firstOrFail();
    $this->admin = User::factory()->role(UserRole::Admin)->create();
});

test('a centre can have its own fee rate that overrides the global one', function () {
    FeeSetting::create(['monthly_fee' => 300, 'overtime_rate' => 6]);
    $student = Student::factory()->create(['centre_id' => $this->taska->id]);

    $this->actingAs($this->admin)->post(route('admin.fees.store'), [
        'centre_id' => $this->taska->id,
        'monthly_fee' => 350,
        'overtime_rate' => 8,
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect((float) FeeSetting::current($this->taska->id)->monthly_fee)->toBe(350.0)
        // The other centre still uses the global rate.
        ->and((float) FeeSetting::current($this->khalifah->id)->monthly_fee)->toBe(300.0);

    $this->actingAs($this->admin)->post(route('admin.payments.store'), [
        'student_id' => $student->id,
        'month' => 'August',
        'overtime_hours' => 2,
    ])->assertRedirect();

    // 350 + 2 × 8 = 366, i.e. the centre rate, not the global 300/6.
    expect((float) FinancialRecord::firstOrFail()->amount)->toBe(366.0);
});

test('saving a new version retires the previous active rate', function () {
    FeeSetting::create(['monthly_fee' => 300, 'overtime_rate' => 6]);

    $this->actingAs($this->admin)->post(route('admin.fees.store'), [
        'monthly_fee' => 350,
        'overtime_rate' => 7,
    ])->assertRedirect();

    expect(FeeSetting::count())->toBe(2)
        ->and(FeeSetting::where('is_active', true)->whereNull('centre_id')->count())->toBe(1)
        ->and((float) FeeSetting::current()->monthly_fee)->toBe(350.0);
});

test('deactivating a centre rate falls back to the global rate', function () {
    FeeSetting::create(['monthly_fee' => 300, 'overtime_rate' => 6]);

    $this->actingAs($this->admin)->post(route('admin.fees.store'), [
        'centre_id' => $this->taska->id,
        'monthly_fee' => 350,
        'overtime_rate' => 8,
    ]);

    $centreRate = FeeSetting::where('centre_id', $this->taska->id)->firstOrFail();

    $this->actingAs($this->admin)
        ->delete(route('admin.fees.destroy', $centreRate))
        ->assertRedirect();

    expect($centreRate->fresh()->is_active)->toBeFalse()
        ->and((float) FeeSetting::current($this->taska->id)->monthly_fee)->toBe(300.0);
});

test('an admin can edit an amount, month, overtime and due date', function () {
    $student = Student::factory()->create();
    $record = FinancialRecord::create([
        'student_id' => $student->id,
        'month' => 'June',
        'amount' => 300,
        'overtime_hours' => 0,
        'status' => 'unpaid',
    ]);

    $this->actingAs($this->admin)->put(route('admin.payments.update', $record), [
        'month' => 'September',
        'amount' => 999.50,
        'overtime_hours' => 3,
        'due_on' => now()->year.'-09-20',
    ])->assertRedirect()->assertSessionHasNoErrors();

    $record->refresh();

    expect($record->month)->toBe('September')
        ->and((float) $record->amount)->toBe(999.50)
        ->and((float) $record->overtime_hours)->toBe(3.0)
        ->and($record->due_on->format('Y-m-d'))->toBe(now()->year.'-09-20');
});

test('the payments list flags overdue records', function () {
    $student = Student::factory()->create();

    FinancialRecord::create([
        'student_id' => $student->id,
        'month' => now()->format('F'),
        'amount' => 300,
        'overtime_hours' => 0,
        'status' => 'unpaid',
        'due_on' => today()->subDay()->toDateString(),
    ]);

    $this->actingAs($this->admin)
        ->get(route('admin.payments.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('records.data.0.overdue', true)
        );
});

test('the fees page renders the scopes', function () {
    FeeSetting::create(['monthly_fee' => 300, 'overtime_rate' => 6]);

    $this->actingAs($this->admin)
        ->get(route('admin.fees.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Fees')
            ->has('centres', 2)
            ->has('current.global')
            ->has('current.perCentre')
        );
});
