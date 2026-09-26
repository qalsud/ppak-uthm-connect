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
}
