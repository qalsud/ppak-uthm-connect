<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\FinancialRecord;
use App\Models\Setting;
use App\Models\Student;
use App\Models\User;
use App\Support\Settings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function settingsAdmin(): User
{
    return User::factory()->role(UserRole::Admin)->create();
}

test('settings fall back to their shipped defaults', function () {
    expect(setting('fees.due_day'))->toBe(7)
        ->and(setting('operations.absence_max_days'))->toBe(31)
        ->and(setting('media.watermark_enabled'))->toBeBool();

    // An unknown key returns the caller's default rather than blowing up.
    expect(setting('does.not.exist', 'fallback'))->toBe('fallback');
});

test('an admin can save settings', function () {
    $admin = settingsAdmin();

    $this->actingAs($admin)->put(route('admin.settings.update'), [
        'settings' => [
            'fees' => ['due_day' => 15],
            'operations' => ['message_max_length' => 500],
        ],
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect(setting('fees.due_day'))->toBe(15)
        ->and(setting('operations.message_max_length'))->toBe(500)
        ->and(Setting::where('key', 'fees.due_day')->value('value'))->toBe('15');
});

test('a blank setting reverts to its default', function () {
    $admin = settingsAdmin();

    $this->actingAs($admin)->put(route('admin.settings.update'), [
        'settings' => ['fees' => ['due_day' => 20]],
    ])->assertRedirect();

    expect(setting('fees.due_day'))->toBe(20);

    // Clearing the field must remove the override, not store a zero.
    $this->actingAs($admin)->put(route('admin.settings.update'), [
        'settings' => ['fees' => ['due_day' => '']],
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect(setting('fees.due_day'))->toBe(7)
        ->and(Setting::where('key', 'fees.due_day')->exists())->toBeFalse();
});

test('out-of-range settings are rejected', function () {
    $this->actingAs(settingsAdmin())->put(route('admin.settings.update'), [
        'settings' => ['fees' => ['due_day' => 99]],
    ])->assertSessionHasErrors('settings.fees.due_day');

    expect(setting('fees.due_day'))->toBe(7);
});

test('the settings page renders every group', function () {
    $this->actingAs(settingsAdmin())
        ->get(route('admin.settings.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Settings')
            ->has('groups', count(Settings::definitions()))
            ->has('scheduler.media_prune')
            ->has('scheduler.fee_reminders')
        );
});

test('a non-admin cannot view or change settings', function () {
    $teacher = User::factory()->role(UserRole::Teacher)->create();

    $this->actingAs($teacher)->get(route('admin.settings.index'))->assertForbidden();

    $this->actingAs($teacher)->put(route('admin.settings.update'), [
        'settings' => ['fees' => ['due_day' => 20]],
    ])->assertForbidden();

    expect(setting('fees.due_day'))->toBe(7);
});

test('the fee due day setting drives generated due dates', function () {
    Student::factory()->create(['status' => 'active']);

    $this->actingAs(settingsAdmin())->put(route('admin.settings.update'), [
        'settings' => ['fees' => ['due_day' => 15]],
    ])->assertRedirect();

    $this->actingAs(settingsAdmin())
        ->post(route('admin.payments.generate'), ['month' => 'January'])
        ->assertRedirect();

    $record = FinancialRecord::firstOrFail();

    expect($record->due_on->format('Y-m-d'))->toBe(now()->year.'-01-15');
});

test('the absence window setting is enforced', function () {
    $parent = User::factory()->role(UserRole::Parent)->create();
    $child = Student::factory()->create(['parent_id' => $parent->id]);

    $this->actingAs(settingsAdmin())->put(route('admin.settings.update'), [
        'settings' => ['operations' => ['absence_max_days' => 3]],
    ])->assertRedirect();

    $this->actingAs($parent)->post(route('parent.absences.store', $child), [
        'start_date' => today()->addDay()->toDateString(),
        'end_date' => today()->addDays(5)->toDateString(),
        'type' => 'sick',
    ])->assertSessionHasErrors('end_date');
});

test('running a scheduled command records that it ran', function () {
    expect(setting('scheduler.fee_reminders_last_run'))->toBeNull();

    $this->artisan('fees:send-reminders')->assertSuccessful();

    expect(setting('scheduler.fee_reminders_last_run'))->not->toBeNull();
});
