<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Attendance;
use App\Models\FinancialRecord;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('the dashboard shows actionable tiles, a year selector and month-over-month', function () {
    $admin = User::factory()->role(UserRole::Admin)->create();
    $student = Student::factory()->create(['status' => 'active']);

    FinancialRecord::create([
        'student_id' => $student->id,
        'month' => now()->format('F'),
        'amount' => 300,
        'overtime_hours' => 0,
        'status' => 'unpaid',
    ]);

    $this->actingAs($admin)
        ->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Dashboard')
            ->where('tiles.unpaid_count', 1)
            // The only active child has not arrived today.
            ->where('tiles.not_checked_in', 1)
            ->where('year', now()->year)
            ->has('years')
            ->has('monthOverMonth')
        );
});

test('checking a child in removes them from the not-checked-in tile', function () {
    $admin = User::factory()->role(UserRole::Admin)->create();
    $student = Student::factory()->create(['status' => 'active']);

    Attendance::create([
        'student_id' => $student->id,
        'date' => today()->toDateString(),
        'arrived_at' => now(),
    ]);

    $this->actingAs($admin)
        ->get(route('admin.dashboard'))
        ->assertInertia(fn (Assert $page) => $page->where('tiles.not_checked_in', 0));
});

test('the dashboard year filter is clamped to a sensible range', function () {
    $admin = User::factory()->role(UserRole::Admin)->create();

    $this->actingAs($admin)
        ->get(route('admin.dashboard', ['year' => 1900]))
        ->assertInertia(fn (Assert $page) => $page->where('year', now()->year - 5));
});
