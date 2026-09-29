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
        $user = $request->user();

        $memos = Memo::query()
            ->with('author:id,name')
            ->whereIn('audience', ['all', 'teachers', 'class'])
            // A class memo is only for that class — and a class key exists at
            // every centre, so the memo's centre must match too.
            ->when($user->centreIds() !== null, fn ($q) => $q->where(fn ($w) => $w
                ->whereIn('centre_id', $user->centreIds())
                ->orWhereNull('centre_id')
            ))
            ->where(function ($q) use ($user) {
                $q->whereIn('audience', ['all', 'teachers']);

                if ($user->class) {
                    $q->orWhere(fn ($w) => $w->where('audience', 'class')->where('class', $user->class));
                }
            })
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Teacher/Memos', [
            'memos' => $memos,
        ]);
    }
}
