<?php

namespace App\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case Teacher = 'teacher';
    case Parent = 'parent';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Admin',
            self::Teacher => 'Teacher',
            self::Parent => 'Parent',
        };
    }

    /** Where should this role land after login? */
    public function homeRoute(): string
    {
        return match ($this) {
            self::Admin => 'admin.dashboard',
            self::Teacher => 'teacher.dashboard',
            self::Parent => 'parent.dashboard',
        };
    }
}
