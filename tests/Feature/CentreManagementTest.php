<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Centre;
use App\Models\Student;
use App\Models\User;
use App\Support\ActiveCentre;
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

test('the admin centre switcher scopes the student list', function () {
    Student::factory()->create(['class' => '5tahun', 'centre_id' => $this->khalifah->id]);
    Student::factory()->create(['class' => '5tahun', 'centre_id' => $this->taska->id]);

    // Default: all centres visible.
    $this->actingAs($this->admin)->get(route('admin.students.index'))
        ->assertInertia(fn (Assert $page) => $page->has('students.data', 2));

    // Switch to one centre.
    $this->actingAs($this->admin)
        ->post(route('admin.centres.switch', ['centre_id' => $this->taska->id]))
        ->assertRedirect();

    $this->actingAs($this->admin)->get(route('admin.students.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('students.data', 1)
            ->where('students.data.0.centre_id', $this->taska->id)
        );

    // Back to all centres.
    $this->actingAs($this->admin)->post(route('admin.centres.switch', ['centre_id' => null]))
        ->assertRedirect();

    $this->actingAs($this->admin)->get(route('admin.students.index'))
        ->assertInertia(fn (Assert $page) => $page->has('students.data', 2));
});

test('the switcher is shared with the frontend for admins only', function () {
    $this->actingAs($this->admin)->get(route('admin.students.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('activeCentre.options', 2)
            ->where('activeCentre.id', null)
        );

    $parent = User::factory()->role(UserRole::Parent)->create();

    $this->actingAs($parent)->get(route('parent.dashboard'))
        ->assertInertia(fn (Assert $page) => $page->where('activeCentre', null));
});

test('an admin can create and edit a centre', function () {
    $this->actingAs($this->admin)->post(route('admin.centres.store'), [
        'name' => 'Tadika Baharu',
        'short_name' => 'Baharu',
        'code' => 'tadika-baharu',
        'phone' => '07-1234567',
    ])->assertRedirect()->assertSessionHasNoErrors();

    $centre = Centre::where('code', 'tadika-baharu')->firstOrFail();

    expect($centre->name)->toBe('Tadika Baharu');

    $this->actingAs($this->admin)->put(route('admin.centres.update', $centre), [
        'name' => 'Tadika Baharu Diperbaharui',
        'code' => 'tadika-baharu',
    ])->assertRedirect();

    expect($centre->fresh()->name)->toBe('Tadika Baharu Diperbaharui');
});

test('a centre code must be unique', function () {
    $this->actingAs($this->admin)->post(route('admin.centres.store'), [
        'name' => 'Duplicate',
        'code' => 'taska-hikmah',
    ])->assertSessionHasErrors('code');
});

test('a centre is deactivated rather than deleted', function () {
    $this->actingAs($this->admin)
        ->delete(route('admin.centres.destroy', $this->taska))
        ->assertRedirect();

    expect(Centre::find($this->taska->id))->not->toBeNull()
        ->and(Centre::find($this->taska->id)->is_active)->toBeFalse();
});

test('an admin can assign a student to a centre', function () {
    $student = Student::factory()->create(['centre_id' => $this->khalifah->id]);

    $this->actingAs($this->admin)->put(route('admin.students.update', $student), [
        'name' => $student->name,
        'class' => $student->class,
        'centre_id' => $this->taska->id,
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect($student->fresh()->centre_id)->toBe($this->taska->id);
});

test('deactivating the active centre resets the switcher', function () {
    $this->actingAs($this->admin)->post(route('admin.centres.switch', ['centre_id' => $this->taska->id]));

    expect(ActiveCentre::id())->toBe($this->taska->id);

    $this->actingAs($this->admin)->delete(route('admin.centres.destroy', $this->taska));

    expect(ActiveCentre::id())->toBeNull();
});

test('a non-admin cannot manage centres', function () {
    $teacher = User::factory()->role(UserRole::Teacher)->create();

    $this->actingAs($teacher)->get(route('admin.centres.index'))->assertForbidden();
    $this->actingAs($teacher)->post(route('admin.centres.switch'), ['centre_id' => $this->taska->id])
        ->assertForbidden();
});
