<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\FinancialRecord;
use App\Models\Memo;
use App\Models\Student;
use App\Models\User;
use App\Support\ActiveCentre;
use App\Support\Lists;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        // Respect the admin's centre switcher (null = all centres).
        $centreId = ActiveCentre::id();
        $scoped = fn ($q) => $centreId
            ? $q->whereHas('student', fn ($s) => $s->where('centre_id', $centreId))
            : $q;

        $pendingParent = User::query()
            ->where('role', UserRole::Parent)
            ->where('status', AccountStatus::Pending)
            ->count();

        $pendingTeacher = User::query()
            ->where('role', UserRole::Teacher)
            ->where('status', AccountStatus::Pending)
            ->count();

        $stats = [
            'students' => Student::query()->inCentre($centreId)->count(),
            'teachers' => User::query()->where('role', UserRole::Teacher)->count(),
            'parents' => User::query()->where('role', UserRole::Parent)->where('status', AccountStatus::Active)->count(),
            'pending' => $pendingParent + $pendingTeacher,
            'memos' => Memo::query()
                ->when($centreId, fn ($q) => $q->where('centre_id', $centreId))
                ->count(),
            'monthly_income' => $scoped(FinancialRecord::query())
                ->where('status', 'paid')
                ->whereMonth('paid_on', now()->month)
                ->sum('amount'),
        ];

        // Monthly income bars (Jan – Dec), from paid records by displayed month.
        $months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        $incomeByMonth = $scoped(FinancialRecord::query())
            ->where('status', 'paid')
            ->get()
            ->groupBy(fn ($r) => $r->Month ?? $r->month)
            ->map(fn ($rows) => (float) $rows->sum('amount'));

        $monthlyChart = array_map(
            fn ($month) => ['month' => substr($month, 0, 3), 'value' => round($incomeByMonth->get($month, 0), 2)],
            $months
        );

        // Derived from the live class list, so an admin-added class appears and
        // both centres count correctly (was hardcoded to 5tahun/6bintang).
        $classCounts = Student::query()
            ->active()
            ->inCentre($centreId)
            ->selectRaw('class, count(*) as aggregate')
            ->groupBy('class')
            ->pluck('aggregate', 'class');

        $classDistribution = collect(Lists::options('class'))
            ->map(fn ($label, $key) => [
                'label' => $label,
                'value' => (int) $classCounts->get($key, 0),
            ])
            ->values()
            ->all();

        $recentPayments = $scoped(FinancialRecord::query())
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
