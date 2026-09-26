<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Memo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

        return Inertia::render('Admin/Memos', [
            'memos' => $memos,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
        ]);

        Memo::create([
            ...$data,
            'author_id' => $request->user()->id,
        ]);

        return back()->with('success', __('approval.memo_created'));
    }

    public function destroy(Request $request, Memo $memo): RedirectResponse
    {
        $memo->delete();

        return back()->with('success', __('approval.deleted'));
    }
}
