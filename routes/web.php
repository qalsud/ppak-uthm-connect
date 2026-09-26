<?php

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
    Route::get('/admin', fn () => Inertia::render('Admin/Dashboard'))
        ->middleware('role:admin')
        ->name('admin.dashboard');

    Route::get('/teacher', fn () => Inertia::render('Teacher/Dashboard'))
        ->middleware('role:teacher')
        ->name('teacher.dashboard');

    Route::get('/parent', fn () => Inertia::render('Parent/Dashboard'))
        ->middleware('role:parent')
        ->name('parent.dashboard');

    // Profile (shared)
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
