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

        // Monthly income bars (Jan – Dec), from paid records by displayed month.
        $months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        $incomeByMonth = FinancialRecord::query()
            ->where('status', 'paid')
            ->get()
            ->groupBy(fn ($r) => $r->Month ?? $r->month)
            ->map(fn ($rows) => (float) $rows->sum('amount'));

        $monthlyChart = array_map(
            fn ($month) => ['month' => substr($month, 0, 3), 'value' => round($incomeByMonth->get($month, 0), 2)],
            $months
        );

        $classDistribution = [
            ['label' => '5 Tahun', 'value' => Student::query()->where('class', '5tahun')->count()],
            ['label' => '6 Bintang', 'value' => Student::query()->where('class', '6bintang')->count()],
        ];

        $recentPayments = FinancialRecord::query()
            ->with('student:id,name,class')
            ->latest('created_at')
            ->limit(8)
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'student' => $r->student?->name ?? '—',
                'month' => $r->month,
                'amount' => (float) $r->amount,
                'status' => $r->status,
                'paid_on' => $r->paid_on?->format('d M Y'),
            ]);

        return Inertia::render('Admin/Dashboard', [
            'stats' => $stats,
            'monthlyChart' => $monthlyChart,
            'classDistribution' => $classDistribution,
            'recentPayments' => $recentPayments,
        ]);
    }
}