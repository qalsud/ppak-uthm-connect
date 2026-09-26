<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Memo;
use Inertia\Inertia;
use Inertia\Response;

class MemoController extends Controller
{
    public function index(): Response
    {
        $memos = Memo::query()
            ->with('author:id,name')
            ->whereIn('audience', ['all', 'teachers', 'class'])
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Teacher/Memos', [
            'memos' => $memos,
        ]);
    }
}
