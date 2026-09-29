<?php

use App\Http\Controllers\Admin\ActivityLogController;
use App\Http\Controllers\Admin\CentreController;
use App\Http\Controllers\Admin\ConversationController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\FeeSettingController;
use App\Http\Controllers\Admin\ListController;
use App\Http\Controllers\Admin\MemoController;
use App\Http\Controllers\Admin\ParentController;
use App\Http\Controllers\Admin\PaymentController;
use App\Http\Controllers\Admin\RegistrationController;
use App\Http\Controllers\Admin\StudentContactController;
use App\Http\Controllers\Admin\StudentController;
use App\Http\Controllers\Admin\TeacherController;
use App\Http\Controllers\Admin\TrashController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\MessageController as MessageOpsController;
use App\Http\Controllers\NotificationsController;
use App\Http\Controllers\Parent\AbsenceController as ParentAbsenceController;
use App\Http\Controllers\Parent\ActivityController as ParentActivityController;
use App\Http\Controllers\Parent\AttendanceController as ParentAttendanceController;
use App\Http\Controllers\Parent\ChildController as ParentChildController;
use App\Http\Controllers\Parent\ContactController as ParentContactController;
use App\Http\Controllers\Parent\DailyUpdateController as ParentDailyUpdateController;
use App\Http\Controllers\Parent\DashboardController as ParentDashboardController;
use App\Http\Controllers\Parent\FinancialController as ParentFinancialController;
use App\Http\Controllers\Parent\MedicationController as ParentMedicationController;
use App\Http\Controllers\Parent\MemoController as ParentMemoController;
use App\Http\Controllers\Parent\MessageController as ParentMessageController;
use App\Http\Controllers\Parent\PaymentController as ParentPaymentController;
use App\Http\Controllers\PhotoController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\StripeWebhookController;
use App\Http\Controllers\Teacher\AbsenceController as TeacherAbsenceController;
use App\Http\Controllers\Teacher\ActivityController as TeacherActivityController;
use App\Http\Controllers\Teacher\AttendanceController as TeacherAttendanceController;
use App\Http\Controllers\Teacher\DailyUpdateController as TeacherDailyUpdateController;
use App\Http\Controllers\Teacher\DashboardController as TeacherDashboardController;
use App\Http\Controllers\Teacher\GrowthController as TeacherGrowthController;
use App\Http\Controllers\Teacher\MedicationController as TeacherMedicationController;
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

    // Global search (shared by all roles)
    Route::get('/search', SearchController::class)->name('search');

    // Stored photos (authorised per role)
    Route::get('/attendance/photos/{photo}', [PhotoController::class, 'attendance'])
        ->name('attendance.photos.show');
    Route::get('/progress/photos/{photo}', [PhotoController::class, 'progress'])
        ->name('progress.photos.show');
    Route::get('/message-attachments/{photo}', [PhotoController::class, 'message'])
        ->name('message.photos.show');
    Route::get('/absence-documents/{attachment}', [PhotoController::class, 'absence'])
        ->name('absence.documents.show');
    Route::get('/students/{student}/photo', [PhotoController::class, 'student'])
        ->name('student.photos.show');
    Route::get('/collectors/{collector}/photo', [PhotoController::class, 'collector'])
        ->name('collector.photos.show');

    // Message operations (polling, unread, edit, delete, search)
    Route::get('/messages/unread', [MessageOpsController::class, 'unread'])->name('messages.unread');
    Route::get('/messages/search', [MessageOpsController::class, 'search'])->name('messages.search');
    Route::get('/messages/{conversation}/updates', [MessageOpsController::class, 'updates'])->name('messages.updates');
    Route::patch('/messages/record/{message}', [MessageOpsController::class, 'update'])->name('messages.update');
    Route::delete('/messages/record/{message}', [MessageOpsController::class, 'destroy'])->name('messages.destroy');

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
            Route::post('/registrations/bulk', [RegistrationController::class, 'bulk'])->name('users.bulk');

            Route::get('/activity', [ActivityLogController::class, 'index'])->name('activity.index');

            Route::get('/conversations', [ConversationController::class, 'index'])->name('conversations.index');
            Route::get('/conversations/export', [ConversationController::class, 'export'])->name('conversations.export');
            Route::get('/conversations/{conversation}', [ConversationController::class, 'show'])->name('conversations.show');

            Route::get('/teachers', [TeacherController::class, 'index'])->name('teachers.index');
            Route::get('/teachers/export', [TeacherController::class, 'export'])->name('teachers.export');
            Route::post('/teachers/import', [TeacherController::class, 'import'])->name('teachers.import');
            Route::post('/teachers/bulk', [TeacherController::class, 'bulk'])->name('teachers.bulk');
            Route::post('/teachers', [TeacherController::class, 'store'])->name('teachers.store');
            Route::put('/teachers/{user}', [TeacherController::class, 'update'])->name('teachers.update');
            Route::delete('/teachers/{user}', [TeacherController::class, 'destroy'])->name('teachers.destroy');

            Route::get('/students', [StudentController::class, 'index'])->name('students.index');
            Route::get('/students/export', [StudentController::class, 'export'])->name('students.export');
            Route::get('/students/{student}', [StudentController::class, 'show'])->name('students.show');
            Route::post('/students/bulk', [StudentController::class, 'bulk'])->name('students.bulk');
            Route::post('/students/import', [StudentController::class, 'import'])->name('students.import');
            Route::post('/students', [StudentController::class, 'store'])->name('students.store');
            Route::put('/students/{student}', [StudentController::class, 'update'])->name('students.update');
            Route::post('/students/{student}/status', [StudentController::class, 'status'])->name('students.status');
            Route::delete('/students/{student}', [StudentController::class, 'destroy'])->name('students.destroy');

            // Recoverable records (soft-deleted).
            Route::get('/trash', [TrashController::class, 'index'])->name('trash.index');
            Route::post('/trash/{type}/{id}', [TrashController::class, 'restore'])->name('trash.restore');

            // Guardians, emergency contacts and authorised collectors.
            Route::post('/students/{student}/guardians', [StudentContactController::class, 'storeGuardian'])->name('students.guardians.store');
            Route::put('/guardians/{guardian}', [StudentContactController::class, 'updateGuardian'])->name('guardians.update');
            Route::delete('/guardians/{guardian}', [StudentContactController::class, 'destroyGuardian'])->name('guardians.destroy');
            Route::post('/students/{student}/emergency-contacts', [StudentContactController::class, 'storeEmergencyContact'])->name('students.contacts.store');
            Route::put('/emergency-contacts/{contact}', [StudentContactController::class, 'updateEmergencyContact'])->name('contacts.update');
            Route::delete('/emergency-contacts/{contact}', [StudentContactController::class, 'destroyEmergencyContact'])->name('contacts.destroy');
            Route::post('/students/{student}/collectors', [StudentContactController::class, 'storeCollector'])->name('students.collectors.store');
            Route::post('/collectors/{collector}', [StudentContactController::class, 'updateCollector'])->name('collectors.update');
            Route::delete('/collectors/{collector}', [StudentContactController::class, 'destroyCollector'])->name('collectors.destroy');

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

            // Admin-editable fixed lists (classes, blood types, …).
            Route::get('/lists', [ListController::class, 'index'])->name('lists.index');
            Route::post('/lists', [ListController::class, 'store'])->name('lists.store');
            Route::put('/lists/{option}', [ListController::class, 'update'])->name('lists.update');
            Route::delete('/lists/{option}', [ListController::class, 'destroy'])->name('lists.destroy');

            // Centres + the active-centre switcher.
            Route::get('/centres', [CentreController::class, 'index'])->name('centres.index');
            Route::post('/centres', [CentreController::class, 'store'])->name('centres.store');
            Route::post('/centres/switch', [CentreController::class, 'switch'])->name('centres.switch');
            Route::put('/centres/{centre}', [CentreController::class, 'update'])->name('centres.update');
            Route::delete('/centres/{centre}', [CentreController::class, 'destroy'])->name('centres.destroy');

            Route::get('/payments', [PaymentController::class, 'index'])->name('payments.index');
            Route::get('/payments/{record}/receipt', [PaymentController::class, 'receipt'])->name('payments.receipt');
            Route::post('/payments/generate', [PaymentController::class, 'generate'])->name('payments.generate');
            Route::post('/payments', [PaymentController::class, 'store'])->name('payments.store');
            Route::patch('/payments/{record}', [PaymentController::class, 'updateStatus'])->name('payments.status');
            Route::delete('/payments/{record}', [PaymentController::class, 'destroy'])->name('payments.destroy');

            // ---- Phase A: admin can act everywhere a teacher can ----------
            // These deliberately reuse the teacher controllers (no duplicated
            // logic). `canManage()` already grants admins, and `assignedClass()`
            // is null for them, so they get the unrestricted view.
            Route::get('/register/attendance', [TeacherAttendanceController::class, 'index'])->name('register.attendance');
            Route::post('/register/attendance/mark-all', [TeacherAttendanceController::class, 'markAll'])->name('register.attendance.mark-all');
            Route::post('/register/attendance/{student}/checkout', [TeacherAttendanceController::class, 'checkout'])->name('register.attendance.checkout');
            Route::post('/register/attendance/{student}', [TeacherAttendanceController::class, 'store'])->name('register.attendance.store');

            Route::post('/register/medications/{medication}', [TeacherMedicationController::class, 'update'])->name('register.medications.update');
            Route::post('/register/absences/{absence}', [TeacherAbsenceController::class, 'update'])->name('register.absences.update');

            Route::get('/register/growth', [TeacherGrowthController::class, 'index'])->name('register.growth.index');
            Route::post('/register/growth', [TeacherGrowthController::class, 'store'])->name('register.growth.store');

            Route::get('/register/activities', [TeacherActivityController::class, 'index'])->name('register.activities.index');
            Route::post('/register/activities', [TeacherActivityController::class, 'store'])->name('register.activities.store');

            Route::get('/register/progress', [TeacherProgressController::class, 'index'])->name('register.progress.index');
            Route::post('/register/progress', [TeacherProgressController::class, 'store'])->name('register.progress.store');

            Route::get('/register/daily-updates', [TeacherDailyUpdateController::class, 'index'])->name('register.daily-updates.index');

            Route::get('/register/messages', [TeacherMessageController::class, 'index'])->name('register.messages.index');
            Route::get('/register/messages/{conversation}', [TeacherMessageController::class, 'show'])->name('register.messages.show');
            Route::post('/register/messages/{conversation}', [TeacherMessageController::class, 'store'])->name('register.messages.store');
            Route::post('/register/messages/student/{student}', [TeacherMessageController::class, 'openWithStudent'])->name('register.messages.open');
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
            Route::get('/growth', [TeacherGrowthController::class, 'index'])->name('growth.index');
            Route::post('/growth', [TeacherGrowthController::class, 'store'])->name('growth.store');
            Route::get('/attendance', [TeacherAttendanceController::class, 'index'])->name('attendance.index');
            Route::post('/attendance/mark-all', [TeacherAttendanceController::class, 'markAll'])->name('attendance.mark-all');
            Route::post('/attendance/{student}/checkout', [TeacherAttendanceController::class, 'checkout'])->name('attendance.checkout');
            Route::post('/attendance/{student}', [TeacherAttendanceController::class, 'store'])->name('attendance.store');
            Route::get('/memos', [TeacherMemoController::class, 'index'])->name('memos.index');
            Route::post('/medications/{medication}', [TeacherMedicationController::class, 'update'])->name('medications.update');
            Route::post('/absences/{absence}', [TeacherAbsenceController::class, 'update'])->name('absences.update');

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
            Route::patch('/children/{student}/profile', [ParentChildController::class, 'updateProfile'])->name('children.profile');
            Route::post('/children/{student}/medications', [ParentMedicationController::class, 'store'])->name('medications.store');
            Route::post('/children/{student}/absences', [ParentAbsenceController::class, 'store'])->name('absences.store');
            Route::post('/absences/{absence}/document', [ParentAbsenceController::class, 'attach'])->name('absences.attach');
            Route::delete('/absences/{absence}', [ParentAbsenceController::class, 'destroy'])->name('absences.destroy');
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
