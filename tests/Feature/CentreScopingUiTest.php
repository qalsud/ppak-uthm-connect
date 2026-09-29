<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Centre;
use App\Models\Memo;
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

test('a teacher can be assigned to both centres', function () {
    $this->actingAs($this->admin)->post(route('admin.teachers.store'), [
        'name' => 'Cikgu Dua Pusat',
        'email' => 'dual@ppakuthm.com',
        'password' => 'password123',
        'class' => '5tahun',
        'centre_ids' => [$this->khalifah->id, $this->taska->id],
    ])->assertRedirect()->assertSessionHasNoErrors();

    $teacher = User::where('email', 'dual@ppakuthm.com')->firstOrFail();

    expect($teacher->centres()->pluck('centres.id')->all())
        ->toEqualCanonicalizing([$this->khalifah->id, $this->taska->id]);

    // And they can manage children at either centre.
    $a = Student::factory()->create(['class' => '5tahun', 'centre_id' => $this->khalifah->id]);
    $b = Student::factory()->create(['class' => '5tahun', 'centre_id' => $this->taska->id]);

    expect($teacher->canManage($a))->toBeTrue()
        ->and($teacher->canManage($b))->toBeTrue();
});

test('editing a teacher replaces their centre assignments', function () {
    $teacher = User::factory()->role(UserRole::Teacher)->create(['class' => '5tahun']);
    $teacher->centres()->attach($this->khalifah->id);

    $this->actingAs($this->admin)->put(route('admin.teachers.update', $teacher), [
        'name' => $teacher->name,
        'email' => $teacher->email,
        'status' => 'active',
        'class' => '5tahun',
        'centre_ids' => [$this->taska->id],
    ])->assertRedirect();

    expect($teacher->fresh()->centres()->pluck('centres.id')->all())
        ->toBe([$this->taska->id]);
});

test('the admin dashboard respects the active centre', function () {
    Student::factory()->create(['class' => '5tahun', 'centre_id' => $this->khalifah->id]);
    Student::factory()->create(['class' => '5tahun', 'centre_id' => $this->taska->id]);
    Student::factory()->create(['class' => '6bintang', 'centre_id' => $this->taska->id]);

    // All centres.
    $this->actingAs($this->admin)->get(route('admin.dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('stats.students', 3)
            ->has('classDistribution', 2)
        );

    // One centre — via the real switcher endpoint, so the session is exercised.
    $this->actingAs($this->admin)
        ->post(route('admin.centres.switch', ['centre_id' => $this->taska->id]))
        ->assertRedirect();

    $this->actingAs($this->admin)->get(route('admin.dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('stats.students', 2)
            ->where('classDistribution', fn ($dist) => collect($dist)
                ->firstWhere('label', '5 Tahun')['value'] === 1)
        );
});

test('the admin memo list respects the active centre', function () {
    Memo::create([
        'author_id' => $this->admin->id,
        'title' => 'Khalifah memo',
        'description' => 'x',
        'audience' => 'all',
        'centre_id' => $this->khalifah->id,
    ]);
    Memo::create([
        'author_id' => $this->admin->id,
        'title' => 'Taska memo',
        'description' => 'x',
        'audience' => 'all',
        'centre_id' => $this->taska->id,
    ]);

    $this->actingAs($this->admin)->get(route('admin.memos.index'))
        ->assertInertia(fn (Assert $page) => $page->has('memos', 2));

    $this->actingAs($this->admin)
        ->post(route('admin.centres.switch', ['centre_id' => $this->khalifah->id]))
        ->assertRedirect();

    $this->actingAs($this->admin)->get(route('admin.memos.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('memos', 1)
            ->where('memos.0.title', 'Khalifah memo')
        );
});

test('a parent sees the centre name for each child', function () {
    $parent = User::factory()->role(UserRole::Parent)->create();
    $child = Student::factory()->create([
        'parent_id' => $parent->id,
        'class' => '5tahun',
        'centre_id' => $this->taska->id,
    ]);

    $this->actingAs($parent)->get(route('parent.children.show', $child))
        ->assertInertia(fn (Assert $page) => $page
            ->where('child.centre', 'Taska Hikmah UTHM')
        );

    $this->actingAs($parent)->get(route('parent.dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('children', 1)
        );
});
