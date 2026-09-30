<?php

namespace Database\Seeders;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\AuthorisedCollector;
use App\Models\Centre;
use App\Models\Conversation;
use App\Models\DailyActivity;
use App\Models\DailyUpdate;
use App\Models\EmergencyContact;
use App\Models\FeeSetting;
use App\Models\FinancialRecord;
use App\Models\Guardian;
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
        // [parent index, name, age, class, gender, extra profile fields]
        $childData = [
            [0, 'Muhammad Adam bin Ahmad Faizal', 6, '6bintang', 'male', [
                'mykid' => '200314-01-0521', 'allergies' => 'Peanuts, shellfish',
                'blood_type' => 'O+', 'immunisation_status' => 'complete',
                'doctor_name' => 'Dr. Tan Wei Ming', 'doctor_phone' => '07-434 1122',
                'medical_consent' => true, 'ethnicity' => 'Melayu', 'religion' => 'Islam',
            ]],
            [0, 'Nur Aisyah binti Ahmad Faizal', 5, '5tahun', 'female', [
                'mykid' => '210628-01-0188', 'blood_type' => 'A+',
                'immunisation_status' => 'complete', 'medical_consent' => true,
                'ethnicity' => 'Melayu', 'religion' => 'Islam',
            ]],
            [0, 'Nur Fatihah binti Ahmad Faizal', 4, '5tahun', 'female', [
                'mykid' => '220905-01-0334', 'immunisation_status' => 'partial',
                'immunisation_notes' => 'Booster due in December', 'blood_type' => 'A+',
                'medical_consent' => true, 'ethnicity' => 'Melayu', 'religion' => 'Islam',
            ]],
            [1, 'Ahmad Danial bin Amran', 6, '6bintang', 'male', [
                'mykid' => '200421-01-0777', 'allergies' => 'Dust, pollen',
                'blood_type' => 'B+', 'immunisation_status' => 'complete',
                'medical_consent' => true, 'ethnicity' => 'Melayu', 'religion' => 'Islam',
            ]],
            [2, 'Muhammad Harith bin Mohd Syafiq', 5, '5tahun', 'male', [
                'mykid' => '210110-01-0412', 'blood_type' => 'O+',
                'immunisation_status' => 'complete', 'has_special_needs' => true,
                'special_needs_notes' => 'Speech therapy every Tuesday; responds well to routines.',
                'dietary_restrictions' => 'No nuts (see allergies)', 'allergies' => 'Cashews',
                'doctor_name' => 'Dr. Siti Nurhaliza', 'doctor_phone' => '07-431 8899',
                'medical_consent' => true, 'ethnicity' => 'Melayu', 'religion' => 'Islam',
            ]],
            [2, 'Muhammad Luqman bin Mohd Syafiq', 6, '6bintang', 'male', [
                'mykid' => '200719-01-0250', 'blood_type' => 'O+',
                'immunisation_status' => 'complete', 'medical_consent' => true,
                'ethnicity' => 'Melayu', 'religion' => 'Islam',
            ]],
            [3, 'Nur Safiya binti Rizal', 5, '5tahun', 'female', [
                'mykid' => '210501-01-0963', 'blood_type' => 'AB+',
                'immunisation_status' => 'complete', 'medical_consent' => true,
                'ethnicity' => 'Melayu', 'religion' => 'Islam',
            ]],
            [4, 'Muhamad Zikry bin Abdul Rahim', 6, '6bintang', 'male', [
                'mykid' => '200802-01-0104', 'blood_type' => 'B-',
                'immunisation_status' => 'exempt', 'immunisation_notes' => 'Medical exemption on file.',
                'medical_consent' => true, 'ethnicity' => 'Melayu', 'religion' => 'Islam',
            ]],
            [4, 'Nur Aliya binti Abdul Rahim', 4, '5tahun', 'female', [
                'mykid' => '220111-01-0620', 'blood_type' => 'B-',
                'immunisation_status' => 'partial', 'dietary_restrictions' => 'Lactose intolerant',
                'medical_consent' => true, 'ethnicity' => 'Melayu', 'religion' => 'Islam',
            ]],
            [5, 'Nurul Iman binti Kamal', 5, '5tahun', 'female', [
                'mykid' => '210923-01-0881', 'blood_type' => 'A-',
                'immunisation_status' => 'complete', 'medical_consent' => true,
                'ethnicity' => 'Melayu', 'religion' => 'Islam',
            ]],
        ];

        $streets = ['Dahlia', 'Kenanga', 'Melor', 'Cempaka', 'Anggerik', 'Seroja', 'Teratai', 'Bunga Raya'];

        $students = collect($childData)->map(function ($c) use ($parents, $streets) {
            $extra = $c[5] ?? [];

            return Student::create([
                'parent_id' => $parents[$c[0]]->id,
                'name' => $c[1],
                'age' => $c[2],
                'class' => $c[3],
                'gender' => $c[4],
                'nationality' => 'malaysian',
                'address' => 'No. '.random_int(1, 60).', Jalan '.$streets[array_rand($streets)].', Parit Raja, Batu Pahat, Johor',
                'date_of_birth' => today()->subYears($c[2])->subDays(random_int(10, 300))->toDateString(),
                'enrolment_date' => today()->subMonths(random_int(3, 20))->toDateString(),
                'medical_consent_at' => ! empty($extra['medical_consent']) ? now() : null,
                ...$extra,
            ]);
        });

        $demoStudent = $students->first();

        // ---- Centres -------------------------------------------------------
        // Spread the demo children and staff across the two centres so the
        // centre switcher, per-centre dashboards and fee rates are all
        // demonstrable on a fresh seed. (The backfill migration only covers
        // rows that already existed when centres were introduced.)
        $khalifah = Centre::where('code', 'khalifah-junior')->first();
        $taska = Centre::where('code', 'taska-hikmah')->first();

        if ($khalifah && $taska) {
            $students->each(fn (Student $student, int $i) => $student->update([
                'centre_id' => $i >= $students->count() - 3 ? $taska->id : $khalifah->id,
            ]));

            $teachers->each(fn (User $teacher, int $i) => $teacher->centres()->sync(match ($i) {
                2 => [],                      // unrestricted — shows the UI warning
                3 => [$taska->id],            // second centre
                default => [$khalifah->id],
            }));
        }

        // ---- Guardians, emergency contacts & authorised collectors --------
        // Every child gets a mother + father; a couple get an extra contact or
        // collector so the safeguarding flows are demonstrable.
        $jobs = ['Guru', 'Jurutera', 'Kerani', 'Penolong Kanan', 'Penjaga Kedai', 'Jururawat'];

        foreach ($students as $index => $student) {
            $father = $student->parent;
            $family = explode(' ', $father?->name ?? 'Ahmad')[0];

            Guardian::create([
                'student_id' => $student->id,
                'user_id' => $father?->id,
                'name' => $father?->name ?? 'Bapa '.$student->name,
                'relationship' => 'father',
                'ic_number' => '80'.random_int(100000, 999999).'01',
                'phone' => '01'.random_int(10000000, 99999999),
                'email' => $father?->email,
                'occupation' => $jobs[array_rand($jobs)],
                'is_primary' => true,
                'can_collect' => true,
            ]);

            Guardian::create([
                'student_id' => $student->id,
                'name' => 'Nor '.$family.' binti '.$family,
                'relationship' => 'mother',
                'ic_number' => '81'.random_int(100000, 999999).'01',
                'phone' => '01'.random_int(10000000, 99999999),
                'occupation' => $jobs[array_rand($jobs)],
                'is_primary' => false,
                'can_collect' => true,
            ]);

            EmergencyContact::create([
                'student_id' => $student->id,
                'name' => $family.' bin Hassan',
                'relationship' => 'grandparent',
                'phone' => '01'.random_int(10000000, 99999999),
                'priority' => 1,
            ]);

            // A couple of children also have a non-family authorised collector.
            if ($index % 4 === 0) {
                EmergencyContact::create([
                    'student_id' => $student->id,
                    'name' => 'Puan Selvi a/p Raman',
                    'relationship' => 'other',
                    'phone' => '01'.random_int(10000000, 99999999),
                    'priority' => 2,
                ]);

                AuthorisedCollector::create([
                    'student_id' => $student->id,
                    'name' => 'Abang '.$family,
                    'relationship' => 'uncle',
                    'phone' => '01'.random_int(10000000, 99999999),
                    'ic_number' => '90'.random_int(100000, 999999).'01',
                    'is_active' => true,
                    'notes' => 'Authorised for Thursday pickups only.',
                ]);
            }
        }

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
