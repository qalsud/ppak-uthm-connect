<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\FeeSettingController;
use App\Http\Controllers\Admin\MemoController;
use App\Http\Controllers\Admin\ParentController;
use App\Http\Controllers\Admin\PaymentController;
use App\Http\Controllers\Admin\RegistrationController;
use App\Http\Controllers\Admin\StudentController;
use App\Http\Controllers\Admin\TeacherController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\NotificationsController;
use App\Http\Controllers\PhotoController;
use App\Http\Controllers\Parent\ActivityController as ParentActivityController;
use App\Http\Controllers\Parent\AttendanceController as ParentAttendanceController;
use App\Http\Controllers\Parent\ChildController as ParentChildController;
use App\Http\Controllers\Parent\ContactController as ParentContactController;
use App\Http\Controllers\Parent\DailyUpdateController as ParentDailyUpdateController;
use App\Http\Controllers\Parent\DashboardController as ParentDashboardController;
use App\Http\Controllers\Parent\FinancialController as ParentFinancialController;
use App\Http\Controllers\Parent\MemoController as ParentMemoController;
use App\Http\Controllers\Parent\MessageController as ParentMessageController;
use App\Http\Controllers\Parent\PaymentController as ParentPaymentController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\StripeWebhookController;
use App\Http\Controllers\Teacher\ActivityController as TeacherActivityController;
use App\Http\Controllers\Teacher\AttendanceController as TeacherAttendanceController;
use App\Http\Controllers\Teacher\DailyUpdateController as TeacherDailyUpdateController;
use App\Http\Controllers\Teacher\DashboardController as TeacherDashboardController;
use App\Http\Controllers\Teacher\MemoController as TeacherMemoController;
use App\Http\Controllers\Teacher\MessageController as TeacherMessageController;
use App\Http\Controllers\Teacher\ProgressController as TeacherProgressController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Public landing
Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

// Language switch (public - sets session locale)
Route::get('/locale/{locale}', [LocaleController::class, 'switch'])
    ->whereIn('locale', ['en', 'ms'])
    ->name('locale.switch');

// Stripe webhook (public, signature-verified)
Route::post('/stripe/webhook', StripeWebhookController::class)->name('stripe.webhook');

// Authenticated + verified + active accounts only
Route::middleware(['auth', 'verified', 'account.active'])->group(function () {

    // Notifications (shared by all roles)
    Route::get('/notifications', [NotificationsController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/read-all', [NotificationsController::class, 'readAll'])->name('notifications.read-all');

    // Stored photos (authorised per role)
    Route::get('/attendance/photos/{photo}', [PhotoController::class, 'attendance'])
        ->name('attendance.photos.show');
    Route::get('/progress/photos/{photo}', [PhotoController::class, 'progress'])
        ->name('progress.photos.show');

    // Role home dashboards
    Route::get('/admin', AdminDashboardController::class)
        ->middleware('role:admin')
        ->name('admin.dashboard');

    Route::get('/teacher', TeacherDashboardController::class)
        ->middleware('role:teacher')
        ->name('teacher.dashboard');

    Route::get('/parent', ParentDashboardController::class)
        ->middleware('role:parent')
        ->name('parent.dashboard');

    // Admin area
    Route::prefix('admin')
        ->middleware('role:admin')
        ->name('admin.')
        ->group(function () {
            Route::get('/registrations', [RegistrationController::class, 'index'])->name('registrations.index');
            Route::post('/users/{user}/approve', [RegistrationController::class, 'approve'])->name('users.approve');
            Route::post('/users/{user}/reject', [RegistrationController::class, 'reject'])->name('users.reject');

            Route::get('/teachers', [TeacherController::class, 'index'])->name('teachers.index');
            Route::get('/teachers/export', [TeacherController::class, 'export'])->name('teachers.export');
            Route::post('/teachers/import', [TeacherController::class, 'import'])->name('teachers.import');
            Route::post('/teachers', [TeacherController::class, 'store'])->name('teachers.store');
            Route::put('/teachers/{user}', [TeacherController::class, 'update'])->name('teachers.update');
            Route::delete('/teachers/{user}', [TeacherController::class, 'destroy'])->name('teachers.destroy');

            Route::get('/students', [StudentController::class, 'index'])->name('students.index');
            Route::get('/students/export', [StudentController::class, 'export'])->name('students.export');
            Route::post('/students/import', [StudentController::class, 'import'])->name('students.import');
            Route::post('/students', [StudentController::class, 'store'])->name('students.store');
            Route::put('/students/{student}', [StudentController::class, 'update'])->name('students.update');
            Route::delete('/students/{student}', [StudentController::class, 'destroy'])->name('students.destroy');

            Route::get('/parents', [ParentController::class, 'index'])->name('parents.index');
            Route::get('/parents/export', [ParentController::class, 'export'])->name('parents.export');
            Route::post('/parents', [ParentController::class, 'store'])->name('parents.store');
            Route::put('/parents/{user}', [ParentController::class, 'update'])->name('parents.update');
            Route::delete('/parents/{user}', [ParentController::class, 'destroy'])->name('parents.destroy');

            Route::get('/memos', [MemoController::class, 'index'])->name('memos.index');
            Route::post('/memos', [MemoController::class, 'store'])->name('memos.store');
            Route::put('/memos/{memo}', [MemoController::class, 'update'])->name('memos.update');
            Route::delete('/memos/{memo}', [MemoController::class, 'destroy'])->name('memos.destroy');

            Route::get('/fees', [FeeSettingController::class, 'show'])->name('fees.show');
            Route::put('/fees', [FeeSettingController::class, 'update'])->name('fees.update');

            Route::get('/payments', [PaymentController::class, 'index'])->name('payments.index');
            Route::get('/payments/{record}/receipt', [PaymentController::class, 'receipt'])->name('payments.receipt');
            Route::post('/payments/generate', [PaymentController::class, 'generate'])->name('payments.generate');
            Route::post('/payments', [PaymentController::class, 'store'])->name('payments.store');
            Route::patch('/payments/{record}', [PaymentController::class, 'updateStatus'])->name('payments.status');
            Route::delete('/payments/{record}', [PaymentController::class, 'destroy'])->name('payments.destroy');
        });

    // Teacher portal
    Route::prefix('teacher')
        ->middleware('role:teacher')
        ->name('teacher.')
        ->group(function () {
            Route::get('/activities', [TeacherActivityController::class, 'index'])->name('activities.index');
            Route::post('/activities', [TeacherActivityController::class, 'store'])->name('activities.store');
            Route::get('/progress', [TeacherProgressController::class, 'index'])->name('progress.index');
            Route::post('/progress', [TeacherProgressController::class, 'store'])->name('progress.store');
            Route::get('/daily-updates', [TeacherDailyUpdateController::class, 'index'])->name('daily-updates.index');
            Route::get('/attendance', [TeacherAttendanceController::class, 'index'])->name('attendance.index');
            Route::post('/attendance/{student}/checkout', [TeacherAttendanceController::class, 'checkout'])->name('attendance.checkout');
            Route::post('/attendance/{student}', [TeacherAttendanceController::class, 'store'])->name('attendance.store');
            Route::get('/memos', [TeacherMemoController::class, 'index'])->name('memos.index');

            Route::get('/messages', [TeacherMessageController::class, 'index'])->name('messages.index');
            Route::get('/messages/{conversation}', [TeacherMessageController::class, 'show'])->name('messages.show');
            Route::post('/messages/{conversation}', [TeacherMessageController::class, 'store'])->name('messages.store');
            Route::post('/messages/student/{student}', [TeacherMessageController::class, 'openWithStudent'])->name('messages.open');
        });

    // Parent portal
    Route::prefix('parent')
        ->middleware('role:parent')
        ->name('parent.')
        ->group(function () {
            Route::get('/daily-update', [ParentDailyUpdateController::class, 'index'])->name('daily-update.index');
            Route::post('/daily-update', [ParentDailyUpdateController::class, 'store'])->name('daily-update.store');
            Route::get('/activities', [ParentActivityController::class, 'index'])->name('activities.index');
            Route::get('/children/{student}', [ParentChildController::class, 'show'])->name('children.show');
            Route::get('/teachers', [ParentContactController::class, 'index'])->name('teachers.index');
            Route::get('/financials', [ParentFinancialController::class, 'index'])->name('financials.index');
            Route::get('/memos', [ParentMemoController::class, 'index'])->name('memos.index');

            Route::get('/attendance', [ParentAttendanceController::class, 'index'])->name('attendance.index');
            Route::post('/payments/checkout', [ParentPaymentController::class, 'checkout'])->name('payments.checkout');
            Route::get('/payments/{payment}/success', [ParentPaymentController::class, 'success'])->name('payments.success');
            Route::get('/payments/{payment}/receipt', [ParentPaymentController::class, 'receipt'])->name('payments.receipt');

            Route::get('/messages', [ParentMessageController::class, 'index'])->name('messages.index');
            Route::get('/messages/{conversation}', [ParentMessageController::class, 'show'])->name('messages.show');
            Route::post('/messages/{conversation}', [ParentMessageController::class, 'store'])->name('messages.store');
            Route::post('/messages/student/{student}', [ParentMessageController::class, 'openWithStudent'])->name('messages.open');
        });

    // Profile (shared)
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
