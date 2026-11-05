<?php

namespace App\Support;

use App\Enums\AccountStatus;
use App\Models\User;
use Illuminate\Validation\Rule;

/**
 * Shared validation for the three user-account controllers (parent, teacher,
 * administrator), so create/update rules cannot drift between them.
 */
class AccountRules
{
    /**
     * @return array<string, mixed>
     */
    public static function write(?User $user = null, bool $requirePassword = true, bool $withContact = true): array
    {
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'email' => $user
                ? ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)]
                : ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => [$requirePassword ? 'required' : 'nullable', 'string', 'min:8'],
        ];

        if ($withContact) {
            $rules['ic_number'] = ['nullable', 'string', 'max:20'];
            $rules['phone'] = ['nullable', 'string', 'max:20'];
        }

        return $rules;
    }

    /**
     * @return array<int, mixed>
     */
    public static function status(): array
    {
        return ['required', Rule::enum(AccountStatus::class)];
    }
}
