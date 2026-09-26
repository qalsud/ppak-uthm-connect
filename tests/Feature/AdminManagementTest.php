<?php

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\FeeSetting;
use App\Models\FinancialRecord;
use App\Models\Memo;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

function admin(): User
{
    return User::factory()->role(UserRole::Admin)->create();
}

function csvUpload(string $name, string $content): UploadedFile
{
    $path = tempnam(sys_get_temp_dir(), 'csv');
    file_put_contents($path, $content);

    return new UploadedFile($path, $name, 'text/csv', null, true);
}

test('guest is redirected from admin pages to login', function () {
    $this->get('/admin')->assertRedirect(route('login'));
    $this->get('/admin/registrations')->assertRedirect(route('login'));
});

test('non-admin roles cannot access admin pages', function () {
    $teacher = User::factory()->role(UserRole::Teacher)->create();

    $this->actingAs($teacher)->get('/admin')->assertForbidden();
    $this->actingAs($teacher)->get('/admin/registrations')->assertForbidden();
});

test('admin can approve a pending parent who can then log in', function () {
    $pending = User::factory()->role(UserRole::Parent)->pending()->create([
        'password' => 'password123',
    ]);

    $this->actingAs(admin())
        ->post(route('admin.users.approve', $pending))
        ->assertRedirect();

    expect($pending->fresh()->status)->toBe(AccountStatus::Active);

    // Log out as admin, then sign in as the freshly-approved parent.
    auth()->logout();

    $this->post('/login', [
        'email' => $pending->email,
        'password' => 'password123',
    ])->assertRedirect(route('parent.dashboard', absolute: false));
});

test('admin can reject a pending registration', function () {
    $pending = User::factory()->role(UserRole::Parent)->pending()->create();

    $this->actingAs(admin())
        ->post(route('admin.users.reject', $pending))
        ->assertRedirect();

    expect($pending->fresh()->status)->toBe(AccountStatus::Rejected);
});

test('admin can create and delete a teacher', function () {
    $this->actingAs(admin())->post(route('admin.teachers.store'), [
        'name' => 'Cikgu Baru',
        'email' => 'cikgu@ppakuthm.com',
        'password' => 'password123',
    ])->assertRedirect();

    $teacher = User::query()->where('email', 'cikgu@ppakuthm.com')->first();
    expect($teacher)->not->toBeNull();
    expect($teacher->role)->toBe(UserRole::Teacher);
    expect($teacher->status)->toBe(AccountStatus::Active);

    $this->actingAs(admin())
        ->delete(route('admin.teachers.destroy', $teacher))
        ->assertRedirect();

    expect(User::find($teacher->id))->toBeNull();
});

test('admin can create a student', function () {
    $parent = User::factory()->role(UserRole::Parent)->create();

    $this->actingAs(admin())->post(route('admin.students.store'), [
        'name' => 'Ali Ahmad',
        'age' => 6,
        'class' => '6bintang',
        'parent_id' => $parent->id,
    ])->assertRedirect();

    expect(Student::query()->where('name', 'Ali Ahmad')->exists())->toBeTrue();
});

test('admin can publish and delete a memo', function () {
    $this->actingAs(admin())->post(route('admin.memos.store'), [
        'title' => 'Perjumpaan Ibu Bapa',
        'description' => 'Tarikh: Sabtu. Jangan lupa hadir.',
    ])->assertRedirect();

    $memo = Memo::query()->where('title', 'Perjumpaan Ibu Bapa')->first();
    expect($memo)->not->toBeNull();

    $this->actingAs(admin())
        ->delete(route('admin.memos.destroy', $memo))
        ->assertRedirect();

    expect(Memo::find($memo->id))->toBeNull();
});

test('admin can update fee settings', function () {
    FeeSetting::create(['monthly_fee' => 310.00, 'overtime_rate' => 6.00]);

    $this->actingAs(admin())->put(route('admin.fees.update'), [
        'monthly_fee' => 350.00,
        'overtime_rate' => 8.00,
    ])->assertRedirect();

    expect(FeeSetting::current()->monthly_fee)->toBe('350.00');
    expect(FeeSetting::current()->overtime_rate)->toBe('8.00');
});

test('admin can add a payment record that totals fee plus overtime', function () {
    FeeSetting::create(['monthly_fee' => 310.00, 'overtime_rate' => 6.00]);
    $student = Student::create(['name' => 'Sarah', 'class' => '5tahun']);

    $this->actingAs(admin())->post(route('admin.payments.store'), [
        'student_id' => $student->id,
        'month' => 'August',
        'overtime_hours' => 2,
    ])->assertRedirect();

    $record = FinancialRecord::query()->where('student_id', $student->id)->first();

    expect($record->amount)->toBe('322.00');
    expect($record->status)->toBe('unpaid');

    $this->actingAs(admin())->patch(route('admin.payments.status', $record), [
        'status' => 'paid',
    ])->assertRedirect();

    expect($record->fresh()->status)->toBe('paid');
    expect($record->fresh()->paid_on)->not->toBeNull();
});

test('admin can import students from a csv and link parents by email', function () {
    $parent = User::factory()->role(UserRole::Parent)->create(['email' => 'ibu@ppakuthm.com']);

    $csv = "name,age,class,parent_email\n"
        ."Ali Ahmad,6,6 Bintang,ibu@ppakuthm.com\n"
        ."Siti Aminah,5,5tahun,\n"
        .",7,5tahun,ibu@ppakuthm.com\n";

    $this->actingAs(admin())
        ->post(route('admin.students.import'), ['file' => csvUpload('students.csv', $csv)])
        ->assertRedirect();

    $ali = Student::query()->where('name', 'Ali Ahmad')->first();

    expect($ali)->not->toBeNull()
        ->and($ali->class)->toBe('6bintang')
        ->and($ali->parent_id)->toBe($parent->id);

    expect(Student::query()->where('name', 'Siti Aminah')->exists())->toBeTrue();
    expect(Student::count())->toBe(2);
});

test('a student cannot be linked to a non-parent account', function () {
    $teacher = User::factory()->role(UserRole::Teacher)->create();

    $this->actingAs(admin())->post(route('admin.students.store'), [
        'name' => 'Ali Ahmad',
        'age' => 6,
        'class' => '6bintang',
        'parent_id' => $teacher->id,
    ])->assertSessionHasErrors('parent_id');

    expect(Student::count())->toBe(0);
});

test('admin can import teachers from a csv with a default password', function () {
    $csv = "name,email,ic_number,phone\n"
        ."Cikgu Nurin,nurin@ppakuthm.com,900101-01-1234,0123456789\n";

    $this->actingAs(admin())
        ->post(route('admin.teachers.import'), ['file' => csvUpload('teachers.csv', $csv)])
        ->assertRedirect();

    $teacher = User::query()->where('email', 'nurin@ppakuthm.com')->first();

    expect($teacher)->not->toBeNull()
        ->and($teacher->role)->toBe(UserRole::Teacher)
        ->and($teacher->status)->toBe(AccountStatus::Active);

    expect(Hash::check('password123', $teacher->password))->toBeTrue();
});

test('admin can reset a teacher password', function () {
    $teacher = User::factory()->role(UserRole::Teacher)->create(['password' => 'oldpassword']);

    $this->actingAs(admin())->put(route('admin.teachers.update', $teacher), [
        'name' => $teacher->name,
        'email' => $teacher->email,
        'status' => 'active',
        'password' => 'newpassword',
    ])->assertRedirect();

    expect(Hash::check('newpassword', $teacher->fresh()->password))->toBeTrue();
});

test('admin can generate monthly fees for every student', function () {
    FeeSetting::create(['monthly_fee' => 310.00, 'overtime_rate' => 6.00]);

    $existing = Student::factory()->create();
    $fresh = Student::factory()->create();

    FinancialRecord::create([
        'student_id' => $existing->id,
        'month' => 'July',
        'amount' => 310,
        'overtime_hours' => 0,
        'status' => 'unpaid',
    ]);

    $this->actingAs(admin())
        ->post(route('admin.payments.generate'), ['month' => 'July'])
        ->assertRedirect();

    // The pre-existing record is skipped; the other student gets one.
    expect(FinancialRecord::query()->where('month', 'July')->count())->toBe(2);

    $record = FinancialRecord::query()
        ->where('student_id', $fresh->id)
        ->where('month', 'July')
        ->first();

    expect($record)->not->toBeNull()
        ->and($record->amount)->toBe('310.00')
        ->and($record->status)->toBe('unpaid');
});

test('payment records can be filtered by status', function () {
    $student = Student::factory()->create();

    FinancialRecord::create([
        'student_id' => $student->id, 'month' => 'June',
        'amount' => 300, 'overtime_hours' => 0, 'status' => 'paid', 'paid_on' => now(),
    ]);
    FinancialRecord::create([
        'student_id' => $student->id, 'month' => 'July',
        'amount' => 300, 'overtime_hours' => 0, 'status' => 'unpaid',
    ]);

    $this->actingAs(admin())
        ->get(route('admin.payments.index', ['status' => 'unpaid']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Payments')
            ->has('records', 1)
            ->where('records.0.status', 'unpaid')
        );
});

test('registrations can be filtered by status and role with counts', function () {
    User::factory()->role(UserRole::Parent)->pending()->create();
    User::factory()->role(UserRole::Teacher)->create();
    User::factory()->role(UserRole::Teacher)->pending()->create();

    $this->actingAs(admin())
        ->get(route('admin.registrations.index', ['status' => 'pending']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Registrations')
            ->has('users', 2)
            ->where('counts.pending', 2)
            ->where('counts.active', 1)
        );

    $this->actingAs(admin())
        ->get(route('admin.registrations.index', ['status' => 'all', 'role' => 'teacher']))
        ->assertInertia(fn (Assert $page) => $page->has('users', 2));
});
