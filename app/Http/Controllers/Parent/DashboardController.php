<?php

namespace App\Http\Controllers\Parent;

use App\Http\Controllers\Controller;
use App\Models\Memo;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $children = $request->user()->students()->with('financialRecords')->get();

        $unpaidTotal = $children->flatMap(fn ($child) => $child->financialRecords)
            ->where('status', 'unpaid')
            ->sum('amount');

        $memoCount = Memo::count();

        return Inertia::render('Parent/Dashboard', [
            'children' => $children,
            'unpaidTotal' => $unpaidTotal,
            'memoCount' => $memoCount,
        ]);
    }
}
