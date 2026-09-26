<?php

namespace App\Http\Controllers\Parent;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class ContactController extends Controller
{
    public function index(): Response
    {
        $teachers = User::query()
            ->where('role', UserRole::Teacher)
            ->where('status', AccountStatus::Active)
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'phone']);

        return Inertia::render('Parent/Teachers', [
            'teachers' => $teachers,
        ]);
    }
}
