<?php

namespace App\Support;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Shared filtering for the admin user lists (parents, teachers, administrators).
 * They all filter by role + status and search name/email, and need the same
 * per-status counts.
 */
class AccountQuery
{
    public static function for(UserRole $role, ?string $status, string $search): Builder
    {
        return User::query()
            ->where('role', $role)
            ->when(
                in_array($status, AccountStatus::values(), true),
                fn (Builder $query) => $query->where('status', $status),
            )
            ->when($search !== '', fn (Builder $query) => $query->where(function (Builder $where) use ($search) {
                $where->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            }));
    }

    /**
     * Counts keyed by status, plus `all` — the shape the list filters expect.
     * An optional scope applies extra constraints (e.g. the centre filter).
     *
     * @return array<string, int>
     */
    public static function counts(UserRole $role, ?callable $scope = null): array
    {
        $base = fn (): Builder => User::query()
            ->where('role', $role)
            ->when($scope, fn (Builder $query) => $scope($query));

        $counts = $base()
            ->get(['status'])
            ->groupBy('status')
            ->map->count();

        return [
            'all' => $base()->count(),
            ...AccountStatus::valuesMap(fn (string $status) => (int) $counts->get($status, 0)),
        ];
    }
}
