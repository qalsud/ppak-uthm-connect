<?php

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Support\Facades\Password;

test('login accepts a differently cased email', function () {
    $user = User::factory()->create(['email' => 'parent@example.com', 'password' => 'password']);

    $this->post('/login', [
        'email' => 'PARENT@Example.COM',
        'password' => 'password',
    ])->assertRedirect();

    $this->assertAuthenticatedAs($user);
});

test('the user model stores emails lowercased and trimmed', function () {
    $user = User::factory()->create(['email' => ' Mixed.Case@Example.COM ']);

    expect($user->fresh()->email)->toBe('mixed.case@example.com');
});

test('an admin cannot create a case-variant duplicate account', function () {
    $admin = User::factory()->role(UserRole::Admin)->create();
    User::factory()->create(['email' => 'teacher@example.com']);

    $this->actingAs($admin)
        ->post(route('admin.teachers.store'), [
            'name' => 'Another Teacher',
            'email' => 'Teacher@Example.com',
            'password' => 'password123',
        ])
        ->assertSessionHasErrors('email');

    expect(User::where('email', 'teacher@example.com')->count())->toBe(1);
});

test('a password reset is sent for a differently cased email', function () {
    $user = User::factory()->create(['email' => 'parent@example.com']);

    $this->post(route('password.email'), ['email' => 'PARENT@Example.COM'])
        ->assertSessionHas('status', __(Password::RESET_LINK_SENT));

    $this->assertDatabaseHas('password_reset_tokens', ['email' => $user->email]);
});
