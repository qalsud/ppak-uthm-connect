<?php

namespace Database\Factories;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'role' => UserRole::Parent,
            'status' => AccountStatus::Active,
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    public function role(UserRole $role): static
    {
        return $this->state(fn () => ['role' => $role]);
    }

    public function pending(): static
    {
        return $this->state(fn () => ['status' => AccountStatus::Pending]);
    }

    /** Attach the created user to a centre once it exists. */
    public function atCentre(int $centreId): static
    {
        return $this->afterCreating(function (User $user) use ($centreId) {
            $user->centres()->syncWithoutDetaching([$centreId]);
        });
    }

    /**
     * Scope the user to specific centre(s). Without this a user has no centre
     * assignment, which means unrestricted (as it did before centres existed).
     */
    public function atCentres(array $centreIds): static
    {
        return $this->afterCreating(function (User $user) use ($centreIds) {
            $user->centres()->syncWithoutDetaching($centreIds);
        });
    }
}
