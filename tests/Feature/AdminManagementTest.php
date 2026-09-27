<?php

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\ActivityLog;
use App\Models\Attendance;
use App\Models\FeeSetting;
use App\Models\FinancialRecord;
use App\Models\Memo;
use App\Models\Payment;
use App\Models\Student;
use App\Models\User;
use App\Notifications\AccountDecisionNotification;
use App\Notifications\CheckInRecordedNotification;
use App\Notifications\MemoPostedNotification;
use App\Notifications\NewRegistrationNotification;
use App\Notifications\PaymentReceivedNotification;
use App\Services\Payments\PaymentCompletionService;
use App\Services\Payments\StripeCheckoutService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
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
            ->has('records.data', 1)
            ->where('records.data.0.status', 'unpaid')
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
            ->has('users.data', 2)
            ->where('counts.pending', 2)
            ->where('counts.active', 1)
        );

    $this->actingAs(admin())
        ->get(route('admin.registrations.index', ['status' => 'all', 'role' => 'teacher']))
        ->assertInertia(fn (Assert $page) => $page->has('users.data', 2));
});

test('admin can manage parents', function () {
    $this->actingAs(admin())->post(route('admin.parents.store'), [
        'name' => 'Ibu Siti',
        'email' => 'siti@ppakuthm.com',
        'password' => 'password123',
    ])->assertRedirect();

    $parent = User::query()->where('email', 'siti@ppakuthm.com')->first();

    expect($parent)->not->toBeNull()
        ->and($parent->role)->toBe(UserRole::Parent)
        ->and($parent->status)->toBe(AccountStatus::Active);

    $this->actingAs(admin())->put(route('admin.parents.update', $parent), [
        'name' => 'Ibu Siti Aminah',
        'email' => 'siti@ppakuthm.com',
        'status' => 'active',
    ])->assertRedirect();

    expect($parent->fresh()->name)->toBe('Ibu Siti Aminah');

    $this->actingAs(admin())
        ->delete(route('admin.parents.destroy', $parent))
        ->assertRedirect();

    expect(User::find($parent->id))->toBeNull();
});

test('a parent account cannot be managed through teacher endpoints', function () {
    $parent = User::factory()->role(UserRole::Parent)->create();

    $this->actingAs(admin())->put(route('admin.teachers.update', $parent), [
        'name' => 'Nope',
        'email' => $parent->email,
        'status' => 'active',
    ])->assertStatus(422);
});

test('parents list shows the number of children', function () {
    $parent = User::factory()->role(UserRole::Parent)->create();
    Student::factory()->count(2)->create(['parent_id' => $parent->id]);

    $this->actingAs(admin())
        ->get(route('admin.parents.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Parents')
            ->has('parents.data', 1)
            ->where('parents.data.0.students_count', 2)
        );
});

test('deleting a parent keeps the children but clears the link', function () {
    $parent = User::factory()->role(UserRole::Parent)->create();
    $student = Student::factory()->create(['parent_id' => $parent->id]);

    $this->actingAs(admin())
        ->delete(route('admin.parents.destroy', $parent))
        ->assertRedirect();

    $student = Student::find($student->id);

    expect($student)->not->toBeNull()
        ->and($student->parent_id)->toBeNull();
});

test('admin can download a receipt for a paid record but not an unpaid one', function () {
    $student = Student::factory()->create();

    $paid = FinancialRecord::create([
        'student_id' => $student->id, 'month' => 'June',
        'amount' => 300, 'overtime_hours' => 2, 'status' => 'paid', 'paid_on' => now(),
    ]);
    $unpaid = FinancialRecord::create([
        'student_id' => $student->id, 'month' => 'July',
        'amount' => 300, 'overtime_hours' => 0, 'status' => 'unpaid',
    ]);

    $response = $this->actingAs(admin())->get(route('admin.payments.receipt', $paid));

    $response->assertOk();
    expect($response->headers->get('content-type'))->toContain('pdf');
    expect($paid->fresh()->ReceiptGenerated)->toBeTrue();

    $this->actingAs(admin())
        ->get(route('admin.payments.receipt', $unpaid))
        ->assertNotFound();
});

test('student import reports skipped rows with reasons', function () {
    $csv = "name,age,class,parent_email\n"
        ."Ali Ahmad,6,6 Bintang,\n"
        .",7,5tahun,\n"
        ."Siti Aminah,5,KelasX,\n";

    $this->actingAs(admin())
        ->post(route('admin.students.import'), ['file' => csvUpload('students.csv', $csv)])
        ->assertSessionHas('import_report')
        ->assertSessionHas('success');

    expect(Student::count())->toBe(1);

    $report = session('import_report');

    expect($report['imported'])->toBe(1)
        ->and(collect($report['skipped'])->pluck('reason')->all())->toBe(['missing_name', 'invalid_class']);
});

test('teacher import reports duplicate emails', function () {
    User::factory()->role(UserRole::Teacher)->create(['email' => 'exists@ppakuthm.com']);

    $csv = "name,email\n"
        ."Cikgu A,exists@ppakuthm.com\n"
        ."Cikgu B,\n"
        ."Cikgu C,new@ppakuthm.com\n";

    $this->actingAs(admin())
        ->post(route('admin.teachers.import'), ['file' => csvUpload('teachers.csv', $csv)])
        ->assertSessionHas('import_report');

    $report = session('import_report');

    expect($report['imported'])->toBe(1)
        ->and(collect($report['skipped'])->pluck('reason')->all())->toBe(['duplicate_email', 'missing_email']);
});

test('admins are notified of a new parent registration', function () {
    Notification::fake();

    $admin = User::factory()->role(UserRole::Admin)->create();

    $this->post('/register', [
        'name' => 'New Parent',
        'email' => 'newparent@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    Notification::assertSentTo($admin, NewRegistrationNotification::class);
});

test('admins are notified when a payment completes', function () {
    Notification::fake();

    $admin = User::factory()->role(UserRole::Admin)->create();
    $parent = User::factory()->role(UserRole::Parent)->create();
    $student = Student::factory()->create(['parent_id' => $parent->id]);

    $payment = Payment::create([
        'user_id' => $parent->id,
        'student_id' => $student->id,
        'amount' => 300,
        'financial_record_ids' => [],
        'status' => 'pending',
    ]);

    app(PaymentCompletionService::class)->complete($payment);

    Notification::assertSentTo($admin, PaymentReceivedNotification::class);
});

test('admin can edit a memo and change its audience', function () {
    $author = admin();
    $memo = Memo::create([
        'author_id' => $author->id, 'title' => 'A', 'description' => 'B', 'audience' => 'all',
    ]);

    $this->actingAs($author)->put(route('admin.memos.update', $memo), [
        'title' => 'A2',
        'description' => 'B2',
        'audience' => 'parents',
    ])->assertRedirect();

    $memo->refresh();

    expect($memo->title)->toBe('A2')
        ->and($memo->audience)->toBe('parents')
        ->and($memo->class)->toBeNull();
});

test('a class memo requires a class and only notifies that class', function () {
    Notification::fake();

    $parent5 = User::factory()->role(UserRole::Parent)->create();
    Student::factory()->create(['parent_id' => $parent5->id, 'class' => '5tahun']);
    $parent6 = User::factory()->role(UserRole::Parent)->create();
    Student::factory()->create(['parent_id' => $parent6->id, 'class' => '6bintang']);
    $teacher = User::factory()->role(UserRole::Teacher)->create();

    // Missing class → validation error.
    $this->actingAs(admin())->post(route('admin.memos.store'), [
        'title' => 'Oops', 'description' => 'x', 'audience' => 'class',
    ])->assertSessionHasErrors('class');

    $this->actingAs(admin())->post(route('admin.memos.store'), [
        'title' => 'Kelas 5 sahaja',
        'description' => 'Untuk kelas 5 tahun.',
        'audience' => 'class',
        'class' => '5tahun',
    ])->assertRedirect();

    Notification::assertSentTo($parent5, MemoPostedNotification::class);
    Notification::assertSentTo($teacher, MemoPostedNotification::class);
    Notification::assertNotSentTo($parent6, MemoPostedNotification::class);
});

test('parents only see memos addressed to them or their class', function () {
    $author = admin();
    $parent = User::factory()->role(UserRole::Parent)->create();
    Student::factory()->create(['parent_id' => $parent->id, 'class' => '5tahun']);

    $make = fn (array $attrs) => Memo::create([...$attrs, 'author_id' => $author->id, 'description' => 'x']);

    $make(['title' => 'For parents', 'audience' => 'parents']);
    $make(['title' => 'For teachers', 'audience' => 'teachers']);
    $make(['title' => 'For class 5', 'audience' => 'class', 'class' => '5tahun']);
    $make(['title' => 'For class 6', 'audience' => 'class', 'class' => '6bintang']);

    $this->actingAs($parent)->get(route('parent.memos.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Parent/Memos')
            ->has('memos', 2)
        );
});

test('admin actions are recorded in the activity log', function () {
    $teacher = User::factory()->role(UserRole::Teacher)->create();
    $admin = admin();

    $this->actingAs($admin)->delete(route('admin.teachers.destroy', $teacher));

    $log = ActivityLog::where('action', 'teacher.deleted')->first();

    expect($log)->not->toBeNull()
        ->and($log->description)->toBe($teacher->name)
        ->and($log->user_id)->toBe($admin->id);
});

test('the activity log page renders paginated entries', function () {
    ActivityLog::record('student.created', null, 'Ali Ahmad');

    $this->actingAs(admin())->get(route('admin.activity.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Activity')
            ->has('logs.data', 1)
            ->where('logs.data.0.action', 'student.created')
        );
});

test('the student list supports server-side search and pagination', function () {
    $parent = User::factory()->role(UserRole::Parent)->create(['name' => 'Cari Nama Unik']);
    Student::factory()->create(['name' => 'Ali', 'parent_id' => $parent->id]);
    Student::factory()->count(20)->create();

    $this->actingAs(admin())
        ->get(route('admin.students.index', ['search' => 'Cari Nama Unik']))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Students')
            ->has('students.data', 1)
            ->where('students.total', 1)
        );

    $this->actingAs(admin())
        ->get(route('admin.students.index'))
        ->assertInertia(fn (Assert $page) => $page->has('students.data', 15));
});

test('admin can open a student detail page', function () {
    $parent = User::factory()->role(UserRole::Parent)->create();
    $student = Student::factory()->create(['parent_id' => $parent->id]);

    $this->actingAs(admin())->get(route('admin.students.show', $student))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Student')
            ->where('student.name', $student->name)
            ->has('attendance')
            ->has('progress')
            ->has('payments')
        );
});

test('admin can bulk archive students', function () {
    $a = Student::factory()->create();
    $b = Student::factory()->create();

    $this->actingAs(admin())->post(route('admin.students.bulk'), [
        'action' => 'withdraw',
        'ids' => [$a->id, $b->id],
    ])->assertRedirect();

    expect($a->fresh()->status)->toBe('withdrawn')
        ->and($b->fresh()->status)->toBe('withdrawn')
        ->and(Student::count())->toBe(2);
});

test('archiving keeps a student\'s history and enrolled students cannot be hard-deleted', function () {
    $student = Student::factory()->create();

    // Active students are protected from permanent deletion.
    $this->actingAs(admin())->delete(route('admin.students.destroy', $student))->assertStatus(422);
    expect(Student::find($student->id))->not->toBeNull();

    // Archive, then permanent delete is allowed.
    $this->actingAs(admin())->post(route('admin.students.status', $student), ['status' => 'withdrawn']);
    expect($student->fresh()->status)->toBe('withdrawn');

    $this->actingAs(admin())->delete(route('admin.students.destroy', $student))->assertRedirect();
    expect(Student::find($student->id))->toBeNull();
});

test('archived students are hidden from active lists', function () {
    $active = Student::factory()->create(['name' => 'Active Kid']);
    $gone = Student::factory()->create(['name' => 'Gone Kid', 'status' => 'withdrawn']);

    $this->actingAs(admin())
        ->get(route('admin.students.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('students.data', 1)
            ->where('students.data.0.name', 'Active Kid')
        );

    $teacher = User::factory()->role(UserRole::Teacher)->create();
    $this->actingAs($teacher)
        ->get(route('teacher.attendance.index', ['class' => $active->class]))
        ->assertInertia(fn (Assert $page) => $page->has('students', 1));
});

test('a teacher assigned to a class only sees and manages that class', function () {
    $teacher = User::factory()->role(UserRole::Teacher)->create(['class' => '5tahun']);
    $mine = Student::factory()->create(['class' => '5tahun']);
    $other = Student::factory()->create(['class' => '6bintang']);

    $this->actingAs($teacher)
        ->get(route('teacher.attendance.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('students', 1)
            ->where('assignedClass', '5tahun')
        );

    $this->actingAs($teacher)
        ->post(route('teacher.attendance.store', $other), ['action' => 'arrive'])
        ->assertForbidden();

    $this->actingAs($teacher)
        ->post(route('teacher.attendance.store', $mine), ['action' => 'arrive'])
        ->assertRedirect();
});

test('an unrestricted teacher can manage any class', function () {
    $teacher = User::factory()->role(UserRole::Teacher)->create(['class' => null]);
    $a = Student::factory()->create(['class' => '5tahun']);
    $b = Student::factory()->create(['class' => '6bintang']);

    $this->actingAs($teacher)->post(route('teacher.attendance.store', $a), ['action' => 'arrive'])->assertRedirect();
    $this->actingAs($teacher)->post(route('teacher.attendance.store', $b), ['action' => 'arrive'])->assertRedirect();
});

test('the global search is role aware', function () {
    $admin = admin();
    Student::factory()->create(['name' => 'Zaharuddin Test']);
    Memo::create(['author_id' => $admin->id, 'title' => 'Zaharuddin Memo', 'description' => 'x']);

    $res = $this->actingAs($admin)->getJson(route('search', ['q' => 'Zaharuddin']))->assertOk();

    $labels = collect($res->json('groups'))->flatMap(fn ($g) => $g['items'])->pluck('label');

    expect($labels)->toContain('Zaharuddin Test')->toContain('Zaharuddin Memo');

    // A parent must not see other children.
    $parent = User::factory()->role(UserRole::Parent)->create();
    $res = $this->actingAs($parent)->getJson(route('search', ['q' => 'Zaharuddin']))->assertOk();
    $parentLabels = collect($res->json('groups'))->flatMap(fn ($g) => $g['items'])->pluck('label');
    expect($parentLabels)->not->toContain('Zaharuddin Test');
});

test('mark-all-present marks the class and notifies parents', function () {
    Notification::fake();

    $parent = User::factory()->role(UserRole::Parent)->create();
    $a = Student::factory()->create(['class' => '5tahun', 'parent_id' => $parent->id]);
    $b = Student::factory()->create(['class' => '5tahun', 'parent_id' => $parent->id]);
    $other = Student::factory()->create(['class' => '6bintang']);

    $teacher = User::factory()->role(UserRole::Teacher)->create(['class' => '5tahun']);

    $this->actingAs($teacher)
        ->post(route('teacher.attendance.mark-all'), ['class' => '5tahun'])
        ->assertRedirect();

    expect(Attendance::where('student_id', $a->id)->first()->status())->toBe('school')
        ->and(Attendance::where('student_id', $b->id)->exists())->toBeTrue()
        ->and(Attendance::where('student_id', $other->id)->exists())->toBeFalse();

    Notification::assertSentTo($parent, CheckInRecordedNotification::class);
});

test('a child is notified as arrived only once', function () {
    Notification::fake();

    $parent = User::factory()->role(UserRole::Parent)->create();
    $student = Student::factory()->create(['parent_id' => $parent->id]);
    $teacher = User::factory()->role(UserRole::Teacher)->create();

    $this->actingAs($teacher)->post(route('teacher.attendance.store', $student), ['action' => 'arrive']);
    $this->actingAs($teacher)->post(route('teacher.attendance.store', $student), ['action' => 'arrive']);

    Notification::assertSentToTimes($parent, CheckInRecordedNotification::class, 1);
});

test('search ignores very short queries', function () {
    $this->actingAs(admin())
        ->getJson(route('search', ['q' => 'a']))
        ->assertOk()
        ->assertJson(['groups' => []]);
});

test('generated fee records get a due date', function () {
    FeeSetting::create(['monthly_fee' => 300, 'overtime_rate' => 6]);
    Student::factory()->create();

    $this->actingAs(admin())->post(route('admin.payments.generate'), ['month' => 'July']);

    $record = FinancialRecord::where('month', 'July')->first();

    expect($record->due_on)->not->toBeNull()
        ->and($record->due_on->format('m-d'))->toBe('07-07');
});

test('a parent can pay only the selected months', function () {
    FeeSetting::create(['monthly_fee' => 300, 'overtime_rate' => 6]);

    $parent = User::factory()->role(UserRole::Parent)->create();
    $student = Student::factory()->create(['parent_id' => $parent->id]);

    $june = FinancialRecord::create(['student_id' => $student->id, 'month' => 'June', 'amount' => 300, 'overtime_hours' => 0, 'status' => 'unpaid']);
    $july = FinancialRecord::create(['student_id' => $student->id, 'month' => 'July', 'amount' => 300, 'overtime_hours' => 0, 'status' => 'unpaid']);

    $this->mock(StripeCheckoutService::class, function ($mock) {
        $mock->shouldReceive('isConfigured')->andReturn(true);
        $mock->shouldReceive('createSession')->andReturn(['url' => 'https://example.test/checkout']);
    });

    $this->actingAs($parent)->post(route('parent.payments.checkout'), [
        'student_id' => $student->id,
        'record_ids' => [$july->id],
    ])->assertRedirect('https://example.test/checkout');

    $payment = Payment::query()->latest('id')->first();

    expect((float) $payment->amount)->toBe(300.0)
        ->and($payment->financial_record_ids)->toBe([$july->id]);
});

test('admin can bulk approve registrations', function () {
    $parent = User::factory()->role(UserRole::Parent)->pending()->create();
    $teacher = User::factory()->role(UserRole::Teacher)->pending()->create();

    $this->actingAs(admin())->post(route('admin.users.bulk'), [
        'action' => 'approve',
        'ids' => [$parent->id, $teacher->id],
    ])->assertRedirect();

    expect($parent->fresh()->status)->toBe(AccountStatus::Active)
        ->and($teacher->fresh()->status)->toBe(AccountStatus::Active);
});

test('bulk endpoints do not touch accounts of another type', function () {
    $parent = User::factory()->role(UserRole::Parent)->create();

    // Parents are not teachers, so the teacher bulk delete must ignore them.
    $this->actingAs(admin())->post(route('admin.teachers.bulk'), [
        'action' => 'delete',
        'ids' => [$parent->id],
    ])->assertRedirect();

    expect(User::find($parent->id))->not->toBeNull();
});

test('approving a registration notifies the applicant', function () {
    Notification::fake();

    $pending = User::factory()->role(UserRole::Parent)->pending()->create();

    $this->actingAs(admin())->post(route('admin.users.approve', $pending))->assertRedirect();

    Notification::assertSentTo($pending, AccountDecisionNotification::class);
});

test('rejecting a registration stores the reason and notifies the applicant', function () {
    Notification::fake();

    $pending = User::factory()->role(UserRole::Parent)->pending()->create();

    $this->actingAs(admin())
        ->post(route('admin.users.reject', $pending), ['reason' => 'Cannot verify details'])
        ->assertRedirect();

    expect($pending->fresh()->rejection_reason)->toBe('Cannot verify details');

    Notification::assertSentTo($pending, AccountDecisionNotification::class);
});
