<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\FinancialRecord;
use App\Models\Memo;
use App\Models\Student;
use App\Models\User;
use App\Support\ActiveCentre;
use App\Support\Lists;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        // Respect the admin's centre switcher (null = all centres).
        $centreId = ActiveCentre::id();
        $scoped = fn ($q) => $centreId
            ? $q->whereHas('student', fn ($s) => $s->where('centre_id', $centreId))
            : $q;

        $year = (int) $request->query('year', now()->year);
        $year = max(now()->year - 5, min(now()->year + 1, $year));

        $lastMonth = now()->subMonthNoOverflow();

        $thisMonthIncome = (float) $scoped(FinancialRecord::query())
            ->where('status', 'paid')
            ->whereYear('paid_on', now()->year)
            ->whereMonth('paid_on', now()->month)
            ->sum('amount');

        $lastMonthIncome = (float) $scoped(FinancialRecord::query())
            ->where('status', 'paid')
            ->whereYear('paid_on', $lastMonth->year)
            ->whereMonth('paid_on', $lastMonth->month)
            ->sum('amount');

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
            'monthly_income' => $thisMonthIncome,
        ];

        // Monthly income bars (Jan – Dec), from paid records by displayed month.
        $months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        $incomeByMonth = $scoped(FinancialRecord::query())
            ->where('status', 'paid')
            ->whereYear('paid_on', $year)
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

        // Actionable tiles: unpaid fees this month + children not yet checked in.
        $unpaidThisMonth = $scoped(FinancialRecord::query())
            ->where('status', 'unpaid')
            ->where('month', now()->format('F'))
            ->get();

        $activeStudentIds = Student::query()->active()->inCentre($centreId)->pluck('id');

        $arrivedToday = Attendance::query()
            ->whereIn('student_id', $activeStudentIds)
            ->whereDate('date', today())
            ->whereNotNull('arrived_at')
            ->pluck('student_id');

        $tiles = [
            'unpaid_month' => now()->format('F'),
            'unpaid_count' => $unpaidThisMonth->count(),
            'unpaid_amount' => (float) $unpaidThisMonth->sum('amount'),
            'students_active' => $activeStudentIds->count(),
            'not_checked_in' => $activeStudentIds->diff($arrivedToday)->count(),
        ];

        $monthOverMonth = [
            'month' => now()->format('F'),
            'this_month' => $thisMonthIncome,
            'last_month' => $lastMonthIncome,
            'delta_pct' => $lastMonthIncome > 0
                ? round((($thisMonthIncome - $lastMonthIncome) / $lastMonthIncome) * 100, 1)
                : null,
        ];

        return Inertia::render('Admin/Dashboard', [
            'stats' => $stats,
            'monthlyChart' => $monthlyChart,
            'classDistribution' => $classDistribution,
            'recentPayments' => $recentPayments,
            'tiles' => $tiles,
            'monthOverMonth' => $monthOverMonth,
            'year' => $year,
            'years' => range(now()->year - 3, now()->year),
        ]);
    }
}
