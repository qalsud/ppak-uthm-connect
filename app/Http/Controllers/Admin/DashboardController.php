<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\FinancialRecord;
use App\Models\Memo;
use App\Models\Student;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $pendingParent = User::query()
            ->where('role', UserRole::Parent)
            ->where('status', AccountStatus::Pending)
            ->count();

        $pendingTeacher = User::query()
            ->where('role', UserRole::Teacher)
            ->where('status', AccountStatus::Pending)
            ->count();

        $stats = [
            'students' => Student::count(),
            'teachers' => User::query()->where('role', UserRole::Teacher)->count(),
            'parents' => User::query()->where('role', UserRole::Parent)->where('status', AccountStatus::Active)->count(),
            'pending' => $pendingParent + $pendingTeacher,
            'memos' => Memo::count(),
            'monthly_income' => FinancialRecord::query()
                ->where('status', 'paid')
                ->whereMonth('paid_on', now()->month)
                ->sum('amount'),
        ];

        return Inertia::render('Admin/Dashboard', [
            'stats' => $stats,
        ]);
    }
}
