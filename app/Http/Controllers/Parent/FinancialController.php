<?php

namespace App\Http\Controllers\Parent;

use App\Http\Controllers\Controller;
use App\Models\FeeSetting;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FinancialController extends Controller
{
    public function index(Request $request): Response
    {
        $children = $request->user()->students()->active()->with('financialRecords')->get();

        $children->each(function ($child) {
            $child->totals = [
                'unpaid' => $child->financialRecords->where('status', 'unpaid')->sum('amount'),
                'paid' => $child->financialRecords->where('status', 'paid')->sum('amount'),
            ];
        });

        return Inertia::render('Parent/Financials', [
            'children' => $children,
            // The rate for the family's centre falls back to the global rate.
            'fee' => FeeSetting::current($children->first()?->centre_id),
        ]);
    }
}
