<?php

namespace Database\Seeders;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\Conversation;
use App\Models\DailyActivity;
use App\Models\DailyUpdate;
use App\Models\FeeSetting;
use App\Models\FinancialRecord;
use App\Models\Memo;
use App\Models\Message;
use App\Models\ProgressRecord;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Idempotent: safe to run on every container boot.
        if (User::query()->exists()) {
            $this->command?->warn('Data already present — skipping demo seed.');

            return;
        }

        // ---- Pricing -------------------------------------------------------
        FeeSetting::create(['monthly_fee' => 310.00, 'overtime_rate' => 6.00, 'is_active' => true]);

        // ---- Admin ---------------------------------------------------------
        $admin = User::create([
            'name' => 'Pentadbir PPAK UTHM',
            'email' => 'admin@ppakuthm.com',
            'password' => 'password123',
            'role' => UserRole::Admin,
            'status' => AccountStatus::Active,
        ]);

        // ---- Teachers ------------------------------------------------------
        $teacherData = [
            ['Nurul Syazana binti Abdu Ghani', 'teacher@ppakuthm.com', '950120-03-5512', '0111234567'],
            ['Farha Nur binti Ismail', 'farha@example.com', '930408-02-5524', '0128765432'],
            ['Ahmad Zaki bin Osman', 'zaki@example.com', '910911-14-5549', '0135557788'],
            ['Siti Hajar binti Mohamad Asbar', 'hajar@example.com', '960223-06-5535', '0147778899'],
        ];

        $teachers = collect($teacherData)->map(fn ($t) => User::create([
            'name' => $t[0],
            'email' => $t[1],
            'ic_number' => str_replace('-', '', $t[2]),
            'phone' => $t[3],
            'password' => 'password123',
            'role' => UserRole::Teacher,
            'status' => AccountStatus::Active,
            'email_verified_at' => now(),
        ]));

        $demoTeacher = $teachers->first();

        // ---- Parents -------------------------------------------------------
        $parentData = [
            ['Ahmad Faizal bin Hassan', 'parent@ppakuthm.com', '800101-01-5523', '0134567890', AccountStatus::Active],
            ['Noraini binti Yusof', 'noraini@example.com', '850312-08-5566', '0192345678', AccountStatus::Active],
            ['Mohd Syafiq bin Rahman', 'syafiq@example.com', '900524-14-5531', '0178889900', AccountStatus::Active],
            ['Siti Nurhaliza binti Omar', 'pending@ppakuthm.com', '870705-06-5588', '0166667788', AccountStatus::Pending],
            ['Abdul Rahim bin Ismail', 'rahim@example.com', '820219-04-5577', '0112223344', AccountStatus::Active],
            ['Zaleha binti Ahmad', 'zaleha@example.com', '780915-08-5544', '0159998877', AccountStatus::Active],
        ];

        $parents = collect($parentData)->map(fn ($p) => User::create([
            'name' => $p[0],
            'email' => $p[1],
            'ic_number' => str_replace('-', '', $p[2]),
            'phone' => $p[3],
            'password' => 'password123',
            'role' => UserRole::Parent,
            'status' => $p[4],
            'email_verified_at' => $p[4] === AccountStatus::Active ? now() : null,
            'activation_token' => $p[4] === AccountStatus::Pending ? Str::random(64) : null,
        ]));

        $demoParent = $parents->first();

        // ---- Children (child name + bin/binti <father>) --------------------
        // [parent index, name, age, class]
        $childData = [
            [0, 'Muhammad Adam bin Ahmad Faizal', 6, '6bintang'],
            [0, 'Nur Aisyah binti Ahmad Faizal', 5, '5tahun'],
            [0, 'Nur Fatihah binti Ahmad Faizal', 4, '5tahun'],
            [1, 'Ahmad Danial bin Amran', 6, '6bintang'],
            [2, 'Muhammad Harith bin Mohd Syafiq', 5, '5tahun'],
            [2, 'Muhammad Luqman bin Mohd Syafiq', 6, '6bintang'],
            [3, 'Nur Safiya binti Rizal', 5, '5tahun'],
            [4, 'Muhamad Zikry bin Abdul Rahim', 6, '6bintang'],
            [4, 'Nur Aliya binti Abdul Rahim', 4, '5tahun'],
            [5, 'Nurul Iman binti Kamal', 5, '5tahun'],
        ];

        $students = collect($childData)->map(fn ($c) => Student::create([
            'parent_id' => $parents[$c[0]]->id,
            'name' => $c[1],
            'age' => $c[2],
            'class' => $c[3],
        ]));

        $demoStudent = $students->first();

        // ---- Memos ---------------------------------------------------------
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

        Memo::create([
            'author_id' => $admin->id,
            'title' => 'Hari Sains & Alam Sekitar — "Cilik Eksperimen"',
            'description' => "Tarikh: 12 November 2025 (Rabu)\nMasa: 8:30 pagi – 11:45 pagi\nTempat: PPAK UTHM\n\nAktiviti eksperimen mudah seperti gunung berapi baking soda dan penanaman biji kacang, bagi mencetuskan minat terhadap sains dan alam sekitar.",
        ]);

        // ---- Financial records --------------------------------------------
        $months = [
            ['January', 0.0, 'paid'],
            ['February', 0.0, 'paid'],
            ['March', 0.0, 'paid'],
            ['April', 0.0, 'unpaid'],
            ['May', 1.0, 'paid'],
            ['June', 0.0, 'unpaid'],
        ];

        foreach ($months as $index => [$month, $ot, $status]) {
            FinancialRecord::create([
                'student_id' => $demoStudent->id,
                'month' => $month,
                'overtime_hours' => $ot,
                'amount' => 310.00 + ($ot * 6.00),
                'status' => $status,
                'paid_on' => $status === 'paid' ? now()->subMonths(count($months) - $index)->toDateString() : null,
            ]);
        }

        // A couple of records for other children (unpaid)
        FinancialRecord::create([
            'student_id' => $students[3]->id,
            'month' => 'June',
            'overtime_hours' => 0,
            'amount' => 310.00,
            'status' => 'unpaid',
        ]);

        FinancialRecord::create([
            'student_id' => $students[4]->id,
            'month' => 'June',
            'overtime_hours' => 2,
            'amount' => 322.00,
            'status' => 'unpaid',
        ]);

        // ---- Today/yesterday records for the demo child --------------------
        DailyUpdate::create([
            'student_id' => $demoStudent->id,
            'date' => today()->toDateString(),
            'arrival_time' => '07:30',
            'sleep_status' => 'Good',
            'bath_status' => 'Done',
            'health_status' => 'Sihat',
            'parent_notes' => 'Tolong beri air masak jika cuaca panas.',
        ]);

        DailyActivity::create([
            'student_id' => $demoStudent->id,
            'teacher_id' => $demoTeacher->id,
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
            'treatment_notes' => 'Selesa hari ini.',
        ]);

        ProgressRecord::create([
            'student_id' => $demoStudent->id,
            'teacher_id' => $demoTeacher->id,
            'date' => now()->subDay()->toDateString(),
            'sub_theme' => 'dalaman',
            'activity_done' => 'Good',
            'child_proficiency' => 'Good',
            'permata_activity' => 'Drawing',
            'free_activity' => 'Learning',
            'development_proficiency' => 'Social Skills',
            'notes' => 'Aktif dan menunjukkan kemajuan.',
        ]);

        // ---- Conversation between the demo parent & teacher ---------------
        $conversation = Conversation::create([
            'student_id' => $demoStudent->id,
            'teacher_id' => $demoTeacher->id,
        ]);

        Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $demoTeacher->id,
            'body' => 'Selamat pagi! Anak tuan menunjukkan perkembangan yang baik hari ini.',
        ]);

        Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $demoParent->id,
            'body' => 'Alhamdulillah, terima kasih cikgu!',
        ]);

        $this->command?->info('Seeded admin, teachers, parents, children, memos, fees, activities and chat.');
    }
}
