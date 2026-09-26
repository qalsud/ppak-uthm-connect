<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TeacherController extends Controller
{
    public function index(): Response
    {
        $teachers = User::query()
            ->where('role', UserRole::Teacher)
            ->orderBy('created_at', 'desc')
            ->get(['id', 'name', 'email', 'ic_number', 'phone', 'status', 'created_at']);

        return Inertia::render('Admin/Teachers', [
            'teachers' => $teachers,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'ic_number' => 'nullable|string|max:20',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:8',
        ]);

        User::create([
            ...$data,
            'role' => UserRole::Teacher,
            'status' => AccountStatus::Active,
            'email_verified_at' => now(),
        ]);

        return back()->with('success', __('approval.teacher_created'));
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        abort_if($user->role !== UserRole::Teacher, 422);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'ic_number' => 'nullable|string|max:20',
            'phone' => 'nullable|string|max:20',
            'status' => ['required', Rule::enum(AccountStatus::class)],
        ]);

        $user->update($data);

        return back()->with('success', __('approval.updated'));
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        abort_if($user->role !== UserRole::Teacher, 422);

        $user->delete();

        return back()->with('success', __('approval.deleted'));
    }

    public function export()
    {
        $teachers = User::query()
            ->where('role', UserRole::Teacher)
            ->orderBy('name')
            ->get();

        return response()->streamDownload(function () use ($teachers) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Name', 'IC', 'Phone', 'Email', 'Status']);

            foreach ($teachers as $teacher) {
                fputcsv($out, [
                    $teacher->name,
                    $teacher->ic_number ?? '',
                    $teacher->phone ?? '',
                    $teacher->email,
                    $teacher->status->value,
                ]);
            }

            fclose($out);
        }, 'teachers.csv', ['Content-Type' => 'text/csv']);
    }
}
