<?php

use App\Enums\UserRole;
use App\Models\Student;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('student and global search are case-insensitive', function () {
    $admin = User::factory()->role(UserRole::Admin)->create();
    Student::factory()->create(['name' => 'Aisyah binti Ali']);

    $this->actingAs($admin)
        ->get(route('admin.students.index', ['search' => 'aisyah']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('students.data', 1)
            ->where('students.data.0.name', 'Aisyah binti Ali')
        );

    $this->actingAs($admin)
        ->getJson(route('search', ['q' => 'AISYAH']))
        ->assertOk()
        ->assertJsonPath('groups.0.items.0.label', 'Aisyah binti Ali');
});
