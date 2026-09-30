<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function dAdmin(): User
{
    return User::factory()->role(UserRole::Admin)->create(['status' => 'active']);
}

test('the administrators page renders', function () {
    $this->actingAs(dAdmin())
        ->get(route('admin.administrators.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Administrators')
            ->has('admins.data', 1)
            ->where('activeAdmins', 1)
            ->has('counts')
        );
});

test('an admin can create another administrator', function () {
    $this->actingAs(dAdmin())->post(route('admin.administrators.store'), [
        'name' => 'New Admin',
        'email' => 'newadmin@example.com',
        'password' => 'password123',
    ])->assertRedirect()->assertSessionHasNoErrors();

    $created = User::where('email', 'newadmin@example.com')->firstOrFail();

    expect($created->role)->toBe(UserRole::Admin)
        ->and($created->isActive())->toBeTrue();
});

test('an admin can edit another administrator and reset their password', function () {
    $me = dAdmin();
    $target = User::factory()->role(UserRole::Admin)->create(['name' => 'Old Name']);

    $this->actingAs($me)->put(route('admin.administrators.update', $target), [
        'name' => 'New Name',
        'email' => $target->email,
        'status' => 'active',
        'password' => 'brand-new-password',
    ])->assertRedirect()->assertSessionHasNoErrors();

    $target->refresh();

    expect($target->name)->toBe('New Name')
        ->and(Hash::check('brand-new-password', $target->password))->toBeTrue();
});

test('an admin cannot delete their own admin account here', function () {
    $me = dAdmin();

    $this->actingAs($me)
        ->delete(route('admin.administrators.destroy', $me))
        ->assertSessionHasErrors('admin');

    expect(User::find($me->id))->not->toBeNull();
});

test('the last active administrator cannot be deactivated', function () {
    $me = dAdmin();

    $this->actingAs($me)->put(route('admin.administrators.update', $me), [
        'name' => $me->name,
        'email' => $me->email,
        'status' => 'rejected',
    ])->assertSessionHasErrors('status');

    expect($me->fresh()->isActive())->toBeTrue();
});

test('with another active admin present, deactivation is allowed', function () {
    $me = dAdmin();
    $other = User::factory()->role(UserRole::Admin)->create(['status' => 'active']);

    $this->actingAs($me)->put(route('admin.administrators.update', $other), [
        'name' => $other->name,
        'email' => $other->email,
        'status' => 'rejected',
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect($other->fresh()->isActive())->toBeFalse();
});

test('a non-admin cannot manage administrators', function () {
    $teacher = User::factory()->role(UserRole::Teacher)->create();

    $this->actingAs($teacher)->get(route('admin.administrators.index'))->assertForbidden();
    $this->actingAs($teacher)->post(route('admin.administrators.store'), [
        'name' => 'Nope',
        'email' => 'nope@example.com',
        'password' => 'password123',
    ])->assertForbidden();

    expect(User::where('email', 'nope@example.com')->exists())->toBeFalse();
});
