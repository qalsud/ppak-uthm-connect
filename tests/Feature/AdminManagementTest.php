<?php

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\FeeSetting;
use App\Models\FinancialRecord;
use App\Models\Memo;
use App\Models\Student;
use App\Models\User;

function admin(): User
{
    return User::factory()->role(UserRole::Admin)->create();
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
