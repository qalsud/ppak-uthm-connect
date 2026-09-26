<?php

namespace Database\Seeders;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\DailyActivity;
use App\Models\DailyUpdate;
use App\Models\FeeSetting;
use App\Models\FinancialRecord;
use App\Models\Memo;
use App\Models\ProgressRecord;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

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
            'email_verified_at' => now(),
        ]);

        $parent = User::create([
            'name' => 'Parent Demo',
            'email' => 'parent@ppakuthm.com',
            'ic_number' => '920101141234',
            'phone' => '0123456789',
            'password' => 'password123',
            'role' => UserRole::Parent,
            'status' => AccountStatus::Active,
            'email_verified_at' => now(),
        ]);

        // A freshly-registered parent, waiting for admin approval
        User::create([
            'name' => 'Ibu Bapa Baharu',
            'email' => 'pending@ppakuthm.com',
            'phone' => '0145556677',
            'password' => 'password123',
            'role' => UserRole::Parent,
            'status' => AccountStatus::Pending,
            'activation_token' => Str::random(64),
        ]);

        $studentA = Student::create([
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

        Student::create([
            'name' => 'Khali Rashid',
            'age' => 6,
            'class' => '6bintang',
        ]);

        Student::create([
            'name' => 'Aidan Rahman',
            'age' => 5,
            'class' => '5tahun',
        ]);

        // Memos — real event notices in Malay, mirroring the legacy data
        Memo::create([
            'author_id' => $admin->id,
            'title' => 'Sambutan Hari Kanak-Kanak — "Bintang Kecil Bersinar"',
            'description' => "Tarikh: 23 Oktober 2025 (Khamis)\nMasa: 8:30 pagi – 12:00 tengah hari\nTempat: Dewan Serbaguna, PPAK UTHM\n\nAcara ini bertujuan meraikan setiap kanak-kanak. Program dimulakan dengan perarakan kostum, persembahan nyanyian dan tarian, sukaneka ringan, serta sesi bercerita.",
        ]);

        Memo::create([
            'author_id' => $admin->id,
            'title' => 'Karnival Mini Merdeka — "Saya Sayang Malaysia"',
            'description' => "Tarikh: 28 Ogos 2025 (Khamis)\nMasa: 9:00 pagi – 11:30 pagi\nTempat: PPAK UTHM\n\nPerarakan dengan bendera kecil, nyanyian lagu patriotik, bengkel kraf dan kuiz mudah untuk menyemai semangat patriotik.",
        ]);

        // Financial records for the demo student
        $records = [
            ['month' => 'January', 'overtime' => 0.0, 'amount' => 310.00, 'status' => 'paid'],
            ['month' => 'February', 'overtime' => 0.0, 'amount' => 310.00, 'status' => 'paid'],
            ['month' => 'March', 'overtime' => 0.0, 'amount' => 310.00, 'status' => 'paid'],
            ['month' => 'June', 'overtime' => 1.0, 'amount' => 316.00, 'status' => 'paid'],
            ['month' => 'July', 'overtime' => 0.0, 'amount' => 310.00, 'status' => 'unpaid'],
        ];

        foreach ($records as $record) {
            FinancialRecord::create([
                'student_id' => $studentA->id,
                'month' => $record['month'],
                'overtime_hours' => $record['overtime'],
                'amount' => $record['amount'],
                'status' => $record['status'],
                'paid_on' => $record['status'] === 'paid' ? now()->subDays(random_int(3, 30)) : null,
            ]);
        }

        // Teacher record: yesterday's daily activity for the demo student
        DailyActivity::create([
            'student_id' => $studentA->id,
            'teacher_id' => $teacher->id,
            'date' => now()->subDay()->toDateString(),
            'afternoon_sleep' => 'yes',
            'medication' => 'no',
            'shower' => 'yes',
            'brush_teeth' => 'yes',
            'drink_milk' => 'yes',
            'breakfast' => 'yes',
            'lunch' => 'yes',
            'afternoon_snack' => 'yes',
            'eat_fruits' => 'yes',
            'tantrum_crying' => 'no',
            'health_issues' => 'no',
            'injuries' => 'no',
            'treatment_notes' => '-',
        ]);

        // Teacher record: latest progress
        ProgressRecord::create([
            'student_id' => $studentA->id,
            'teacher_id' => $teacher->id,
            'date' => now()->subDay()->toDateString(),
            'sub_theme' => 'outdoor',
            'activity_done' => 'Good',
            'child_proficiency' => 'Good',
            'permata_activity' => 'Drawing',
            'free_activity' => 'Learning',
            'development_proficiency' => 'Social Skills',
            'notes' => 'good',
        ]);

        // Parent record: this morning's daily update
        DailyUpdate::create([
            'student_id' => $studentA->id,
            'date' => now()->toDateString(),
            'arrival_time' => '07:30',
            'sleep_status' => 'Good',
            'bath_status' => 'Done',
            'health_status' => 'good',
            'parent_notes' => 'Tolong bagi ubat jika demam.',
        ]);

        $this->command?->info('Seeded demo data (admin/teacher/parent/pending, students, memos, payments).');
    }
}
