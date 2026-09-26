<?php

namespace App\Enums;

enum AccountStatus: string
{
    case Pending = 'pending';
    case AwaitingActivation = 'awaiting';
    case Active = 'active';
    case Rejected = 'rejected';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::AwaitingActivation => 'Awaiting activation',
            self::Active => 'Active',
            self::Rejected => 'Rejected',
        };
    }

    /** @return array<int, string> */
    public static function values(): array
    {
        return array_map(fn (self $status) => $status->value, self::cases());
    }

    /**
     * Map each status value through a callback, keyed by value.
     *
     * @return array<string, mixed>
     */
    public static function valuesMap(callable $callback): array
    {
        $mapped = [];

        foreach (self::cases() as $status) {
            $mapped[$status->value] = $callback($status->value);
        }

        return $mapped;
    }
}
