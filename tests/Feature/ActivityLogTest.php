<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function activityAdmin(): User
{
    return User::factory()->role(UserRole::Admin)->create();
}

test('the activity log can be filtered by action, user and date', function () {
    $admin = activityAdmin();
    $other = User::factory()->role(UserRole::Admin)->create();

    ActivityLog::create(['user_id' => $admin->id, 'action' => 'student.created', 'description' => 'Child A']);

    // created_at is not mass-assignable on the model, so set it explicitly.
    $old = ActivityLog::create(['user_id' => $other->id, 'action' => 'fees.updated', 'description' => 'Fees B']);
    $old->forceFill(['created_at' => now()->subDays(40)])->save();

    // By action.
    $this->actingAs($admin)
        ->get(route('admin.activity.index', ['action' => 'student.created']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('logs.data', 1)
            ->where('logs.data.0.action', 'student.created')
            ->has('actions')
            ->has('users')
        );

    // By user.
    $this->actingAs($admin)
        ->get(route('admin.activity.index', ['user' => $other->id]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('logs.data', 1)
            ->where('logs.data.0.action', 'fees.updated')
        );

    // By date range that excludes the older row.
    $this->actingAs($admin)
        ->get(route('admin.activity.index', ['from' => today()->subDays(7)->toDateString()]))
        ->assertInertia(fn (Assert $page) => $page->has('logs.data', 1));
});

test('the activity log can be exported as csv', function () {
    $admin = activityAdmin();
    ActivityLog::create(['user_id' => $admin->id, 'action' => 'student.created', 'description' => 'Child A']);

    $response = $this->actingAs($admin)->get(route('admin.activity.export'));

    $response->assertOk();
    expect($response->headers->get('content-type'))->toContain('text/csv');
});

test('a non-admin cannot view or export the activity log', function () {
    $teacher = User::factory()->role(UserRole::Teacher)->create();

    $this->actingAs($teacher)->get(route('admin.activity.index'))->assertForbidden();
    $this->actingAs($teacher)->get(route('admin.activity.export'))->assertForbidden();
});
