<?php

namespace App\Http\Controllers\Parent;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ContactController extends Controller
{
    public function index(Request $request): Response
    {
        $children = $request->user()->students()->active()->get(['class', 'centre_id']);
        $classes = $children->pluck('class')->filter()->unique()->values();
        $centreIds = $children->pluck('centre_id')->filter()->unique()->values();

        $teachers = User::query()
            ->where('role', UserRole::Teacher)
            ->where('status', AccountStatus::Active)
            ->when($classes->isNotEmpty(), fn ($q) => $q->whereIn('class', $classes))
            ->when($centreIds->isNotEmpty(), fn ($q) => $q->whereHas(
                'centres',
                fn ($c) => $c->whereIn('centres.id', $centreIds)
            ))
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'phone']);

        return Inertia::render('Parent/Teachers', [
            'teachers' => $teachers,
        ]);
    }
}
