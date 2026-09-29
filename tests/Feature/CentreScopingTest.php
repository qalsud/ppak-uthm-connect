<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Centre;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\CentreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Phase G0: with two centres, "5tahun" exists at BOTH — so access must match on
 * centre as well as class. Previously `canManage()` compared only the class
 * string, which let a teacher at one centre manage the other centre's children.
 */
beforeEach(function () {
    $this->seed(CentreSeeder::class);
    $this->khalifah = Centre::where('code', 'khalifah-junior')->firstOrFail();
    $this->taska = Centre::where('code', 'taska-hikmah')->firstOrFail();
});

test('a teacher cannot manage a child in another centre with the same class name', function () {
    $teacher = User::factory()->role(UserRole::Teacher)->create(['class' => '5tahun']);
    $teacher->centres()->attach($this->khalifah->id);

    $mine = Student::factory()->create(['class' => '5tahun', 'centre_id' => $this->khalifah->id]);
    $theirs = Student::factory()->create(['class' => '5tahun', 'centre_id' => $this->taska->id]);

    expect($teacher->canManage($mine))->toBeTrue()
        ->and($teacher->canManage($theirs))->toBeFalse();
});

test('a teacher who works at both centres can manage both', function () {
    $teacher = User::factory()->role(UserRole::Teacher)->create(['class' => '5tahun']);
    $teacher->centres()->attach([$this->khalifah->id, $this->taska->id]);

    $a = Student::factory()->create(['class' => '5tahun', 'centre_id' => $this->khalifah->id]);
    $b = Student::factory()->create(['class' => '5tahun', 'centre_id' => $this->taska->id]);

    expect($teacher->canManage($a))->toBeTrue()
        ->and($teacher->canManage($b))->toBeTrue();
});

test('an unrestricted teacher is still limited to their own centres', function () {
    $teacher = User::factory()->role(UserRole::Teacher)->create(['class' => null]);
    $teacher->centres()->attach($this->khalifah->id);

    $sameCentre = Student::factory()->create(['class' => '6bintang', 'centre_id' => $this->khalifah->id]);
    $otherCentre = Student::factory()->create(['class' => '6bintang', 'centre_id' => $this->taska->id]);

    // No class restriction, but the centre still applies.
    expect($teacher->canManage($sameCentre))->toBeTrue()
        ->and($teacher->canManage($otherCentre))->toBeFalse();
});

test('an admin can manage any child in any centre', function () {
    $admin = User::factory()->role(UserRole::Admin)->create();

    $a = Student::factory()->create(['class' => '5tahun', 'centre_id' => $this->khalifah->id]);
    $b = Student::factory()->create(['class' => '5tahun', 'centre_id' => $this->taska->id]);

    expect($admin->canManage($a))->toBeTrue()
        ->and($admin->canManage($b))->toBeTrue()
        ->and($admin->centreIds())->toBeNull();
});

test('a teacher cannot reach another centre child through the attendance register', function () {
    $teacher = User::factory()->role(UserRole::Teacher)->create(['class' => '5tahun']);
    $teacher->centres()->attach($this->khalifah->id);

    $theirs = Student::factory()->create(['class' => '5tahun', 'centre_id' => $this->taska->id]);

    $this->actingAs($teacher)
        ->post(route('teacher.attendance.store', $theirs), ['action' => 'arrive'])
        ->assertForbidden();
});

test('both centres may have a class with the same key', function () {
    // The whole reason centre scoping exists: the key is not globally unique.
    $a = Student::factory()->create(['class' => '5tahun', 'centre_id' => $this->khalifah->id]);
    $b = Student::factory()->create(['class' => '5tahun', 'centre_id' => $this->taska->id]);

    expect($a->class)->toBe($b->class)
        ->and($a->centre_id)->not->toBe($b->centre_id)
        ->and(Student::where('class', '5tahun')->count())->toBe(2)
        ->and(Student::where('class', '5tahun')->where('centre_id', $this->khalifah->id)->count())->toBe(1);
});

test('the centre seeder is idempotent', function () {
    $this->seed(CentreSeeder::class);
    $this->seed(CentreSeeder::class);

    expect(Centre::count())->toBe(2);
});
