<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\ListOption;
use App\Models\Student;
use App\Models\User;
use App\Support\Lists;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function listAdmin(): User
{
    return User::factory()->role(UserRole::Admin)->create();
}

test('lists fall back to shipped defaults when nothing is customised', function () {
    expect(Lists::keys('blood_type'))->toBe(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
        ->and(Lists::options('gender'))->toBe(['male' => 'Male', 'female' => 'Female'])
        ->and(Lists::label('blood_type', 'O+'))->toBe('O+')
        ->and(Lists::label('gender', 'male'))->toBe('Male');

    // An unknown key falls back to the raw value rather than blowing up.
    expect(Lists::label('gender', 'nonsense'))->toBe('nonsense');
});

test('the admin can rename an option and validation follows', function () {
    $admin = listAdmin();

    // Rename a class label.
    $this->actingAs($admin)->post(route('admin.lists.store'), [
        'group' => 'class',
        'key' => '5tahun',
        'label' => '5 Tahun (Morning)',
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect(Lists::label('class', '5tahun'))->toBe('5 Tahun (Morning)');

    // Editing seeds the defaults so the rest of the list is preserved.
    expect(ListOption::where('group', 'class')->pluck('key')->all())
        ->toContain('5tahun')
        ->toContain('6bintang');
});

test('the admin can add a new class and it becomes valid for students', function () {
    $admin = listAdmin();

    $this->actingAs($admin)->post(route('admin.lists.store'), [
        'group' => 'class',
        'key' => '4tahun',
        'label' => '4 Tahun',
    ])->assertRedirect();

    expect(Lists::keys('class'))->toContain('4tahun');

    // A student can now be created in the new class.
    $this->actingAs($admin)->post(route('admin.students.store'), [
        'name' => 'New Child',
        'class' => '4tahun',
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect(Student::where('class', '4tahun')->exists())->toBeTrue();
});

test('an option that is not in the list is rejected', function () {
    $admin = listAdmin();

    $this->actingAs($admin)->post(route('admin.students.store'), [
        'name' => 'Bad Class Child',
        'class' => '9tahun',
    ])->assertSessionHasErrors('class');

    expect(Student::count())->toBe(0);
});

test('an option in use is deactivated rather than deleted', function () {
    $admin = listAdmin();
    Student::factory()->create(['class' => '5tahun']);

    $this->actingAs($admin)->post(route('admin.lists.store'), [
        'group' => 'class',
        'key' => '5tahun',
        'label' => '5 Tahun',
    ])->assertRedirect();

    $option = ListOption::where('group', 'class')->where('key', '5tahun')->firstOrFail();

    $this->actingAs($admin)->delete(route('admin.lists.destroy', $option))->assertRedirect();

    // Still present, but inactive — existing students keep working.
    expect(ListOption::find($option->id))->not->toBeNull()
        ->and(ListOption::find($option->id)->is_active)->toBeFalse();
});

test('an unused option is deleted outright', function () {
    $admin = listAdmin();

    $this->actingAs($admin)->post(route('admin.lists.store'), [
        'group' => 'class',
        'key' => 'spare',
        'label' => 'Spare Class',
    ])->assertRedirect();

    $option = ListOption::where('group', 'class')->where('key', 'spare')->firstOrFail();

    $this->actingAs($admin)->delete(route('admin.lists.destroy', $option))->assertRedirect();

    expect(ListOption::find($option->id))->toBeNull();
});

test('the lists screen renders every manageable group', function () {
    $this->actingAs(listAdmin())
        ->get(route('admin.lists.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Lists')
            ->has('groups', count(Lists::MANAGEABLE))
        );
});

test('lists are shared with the frontend for every authenticated user', function () {
    $parent = User::factory()->role(UserRole::Parent)->create();

    $this->actingAs($parent)->get(route('parent.dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('lists.class')
            ->has('lists.blood_type')
        );
});

test('a non-admin cannot manage lists', function () {
    $teacher = User::factory()->role(UserRole::Teacher)->create();

    $this->actingAs($teacher)->get(route('admin.lists.index'))->assertForbidden();

    $this->actingAs($teacher)->post(route('admin.lists.store'), [
        'group' => 'class',
        'key' => '4tahun',
        'label' => '4 Tahun',
    ])->assertForbidden();

    expect(ListOption::count())->toBe(0);
});

test('renaming a class shows up in the shared frontend lists', function () {
    $admin = listAdmin();

    $this->actingAs($admin)->post(route('admin.lists.store'), [
        'group' => 'class',
        'key' => '5tahun',
        'label' => '5 Tahun Ceria',
    ])->assertRedirect();

    // Any authenticated page receives the renamed label for forms + displays.
    $this->actingAs($admin)->get(route('admin.students.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('lists.class', fn ($options) => collect($options)
                ->firstWhere('value', '5tahun')['label'] === '5 Tahun Ceria')
        );

    // And the parent portal sees it too.
    $parent = User::factory()->role(UserRole::Parent)->create();

    $this->actingAs($parent)->get(route('parent.dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('lists.class', fn ($options) => collect($options)
                ->firstWhere('value', '5tahun')['label'] === '5 Tahun Ceria')
        );
});

test('an invalid group is rejected', function () {
    $this->actingAs(listAdmin())->post(route('admin.lists.store'), [
        'group' => 'not_a_real_group',
        'key' => 'x',
        'label' => 'X',
    ])->assertSessionHasErrors('group');
});
