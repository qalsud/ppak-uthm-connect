<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FeeSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FeeSettingController extends Controller
{
    public function show(): Response
    {
        $fee = FeeSetting::current();

        return Inertia::render('Admin/Fees', [
            'fee' => $fee,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'monthly_fee' => 'required|numeric|min:0',
            'overtime_rate' => 'required|numeric|min:0',
        ]);

        $fee = FeeSetting::current();
        $fee->update($data);

        return back()->with('success', __('approval.fee_updated'));
    }
}
