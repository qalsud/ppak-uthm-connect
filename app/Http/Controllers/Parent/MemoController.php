<?php

namespace App\Http\Controllers\Parent;

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
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Parent/Memos', [
            'memos' => $memos,
        ]);
    }
}
