<?php

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\User;

test('registration screen can be rendered', function () {
    $response = $this->get('/register');

    $response->assertStatus(200);
});

test('new parents register with a pending account instead of being logged in', function () {
    $response = $this->post('/register', [
        'name' => 'Test Parent',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertGuest();
    $response->assertRedirect(route('login', absolute: false));

    $user = User::query()->where('email', 'test@example.com')->first();

    expect($user->role)->toBe(UserRole::Parent);
    expect($user->status)->toBe(AccountStatus::Pending);
    expect($user->activation_token)->not->toBeNull();
});
