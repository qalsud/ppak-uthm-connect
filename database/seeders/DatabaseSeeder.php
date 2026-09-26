<?php

namespace Database\Seeders;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\FeeSetting;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Default pricing configuration
        FeeSetting::create([
            'monthly_fee' => 310.00,
            'overtime_rate' => 6.00,
            'is_active' => true,
        ]);

        // --- Demo accounts (all password: password123) ---

        $admin = User::create([
            'name' => 'Admin PPAK',
            'email' => 'admin@ppakuthm.com',
            'password' => 'password123',
            'role' => UserRole::Admin,
            'status' => AccountStatus::Active,
        ]);

        $teacher = User::create([
            'name' => 'Teacher Demo',
            'email' => 'teacher@ppakuthm.com',
            'password' => 'password123',
            'role' => UserRole::Teacher,
            'status' => AccountStatus::Active,
        ]);

        $parent = User::create([
            'name' => 'Parent Demo',
            'email' => 'parent@ppakuthm.com',
            'ic_number' => '920101141234',
            'phone' => '0123456789',
            'password' => 'password123',
            'role' => UserRole::Parent,
            'status' => AccountStatus::Active,
        ]);

        Student::create([
            'parent_id' => $parent->id,
            'name' => 'Anak Demo',
            'age' => 6,
            'class' => '6bintang',
        ]);

        Student::create([
            'parent_id' => $parent->id,
            'name' => 'Adik Demo',
            'age' => 5,
            'class' => '5tahun',
        ]);

        Student::create([
            'name' => 'Siti Aisyah',
            'age' => 6,
            'class' => '6bintang',
        ]);

        $this->command?->info('Seeded admin/teacher/parent (password123), students and fee settings.');
    }
}
