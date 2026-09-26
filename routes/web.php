<?php

use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\FeeSettingController;
use App\Http\Controllers\Admin\MemoController;
use App\Http\Controllers\Admin\PaymentController;
use App\Http\Controllers\Admin\RegistrationController;
use App\Http\Controllers\Admin\StudentController;
use App\Http\Controllers\Admin\TeacherController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\ProfileController;
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

// Authenticated + verified + active accounts only
Route::middleware(['auth', 'verified', 'account.active'])->group(function () {

    // Role home dashboards
    Route::get('/admin', DashboardController::class)
        ->middleware('role:admin')
        ->name('admin.dashboard');

    Route::get('/teacher', fn () => Inertia::render('Teacher/Dashboard'))
        ->middleware('role:teacher')
        ->name('teacher.dashboard');

    Route::get('/parent', fn () => Inertia::render('Parent/Dashboard'))
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
            Route::post('/teachers', [TeacherController::class, 'store'])->name('teachers.store');
            Route::put('/teachers/{user}', [TeacherController::class, 'update'])->name('teachers.update');
            Route::delete('/teachers/{user}', [TeacherController::class, 'destroy'])->name('teachers.destroy');

            Route::get('/students', [StudentController::class, 'index'])->name('students.index');
            Route::post('/students', [StudentController::class, 'store'])->name('students.store');
            Route::put('/students/{student}', [StudentController::class, 'update'])->name('students.update');
            Route::delete('/students/{student}', [StudentController::class, 'destroy'])->name('students.destroy');

            Route::get('/memos', [MemoController::class, 'index'])->name('memos.index');
            Route::post('/memos', [MemoController::class, 'store'])->name('memos.store');
            Route::delete('/memos/{memo}', [MemoController::class, 'destroy'])->name('memos.destroy');

            Route::get('/fees', [FeeSettingController::class, 'show'])->name('fees.show');
            Route::put('/fees', [FeeSettingController::class, 'update'])->name('fees.update');

            Route::get('/payments', [PaymentController::class, 'index'])->name('payments.index');
            Route::post('/payments', [PaymentController::class, 'store'])->name('payments.store');
            Route::patch('/payments/{record}', [PaymentController::class, 'updateStatus'])->name('payments.status');
            Route::delete('/payments/{record}', [PaymentController::class, 'destroy'])->name('payments.destroy');
        });

    // Profile (shared)
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
