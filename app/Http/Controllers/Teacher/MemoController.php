<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Memo;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MemoController extends Controller
{
    public function index(Request $request): Response
    {
        $memos = Memo::query()
            ->with('author:id,name')
            // Visibility lives in one place (Memo::visibleTo) so the memo list
            // and the dashboard badge can never disagree.
            ->visibleTo($request->user())
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Teacher/Memos', [
            'memos' => $memos,
        ]);
    }
}
