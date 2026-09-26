<?php

namespace App\Http\Controllers\Parent;

use App\Http\Controllers\Controller;
use App\Models\Memo;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MemoController extends Controller
{
    public function index(Request $request): Response
    {
        $classes = $request->user()->students()->pluck('class')->unique();

        $memos = Memo::query()
            ->with('author:id,name')
            ->where(function ($query) use ($classes) {
                $query->whereIn('audience', ['all', 'parents'])
                    ->orWhere(fn ($q) => $q->where('audience', 'class')->whereIn('class', $classes));
            })
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Parent/Memos', [
            'memos' => $memos,
        ]);
    }
}
