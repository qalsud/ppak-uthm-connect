<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TeacherController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->query('status');
        $search = trim((string) $request->query('search', ''));
        $class = $request->query('class');

        $teachers = User::query()
            ->where('role', UserRole::Teacher)
            ->when(
                in_array($status, AccountStatus::values(), true),
                fn ($q) => $q->where('status', $status)
            )
            ->when(in_array($class, Student::CLASSES, true), fn ($q) => $q->where('class', $class))
            ->when($search !== '', fn ($q) => $q->where(function ($w) use ($search) {
                $w->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            }))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        $counts = User::query()
            ->where('role', UserRole::Teacher)
            ->get(['status'])
            ->groupBy('status')
            ->map->count();

        return Inertia::render('Admin/Teachers', [
            'teachers' => $teachers,
            'counts' => [
                'all' => User::query()->where('role', UserRole::Teacher)->count(),
                ...AccountStatus::valuesMap(fn ($s) => $counts->get($s, 0)),
            ],
            'filters' => ['status' => $status ?? '', 'search' => $search, 'class' => $class ?? ''],
            'classes' => Student::CLASSES,
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
            'class' => ['nullable', Rule::in(Student::CLASSES)],
        ]);

        $teacher = User::create([
            ...$data,
            'role' => UserRole::Teacher,
            'status' => AccountStatus::Active,
            'email_verified_at' => now(),
        ]);

        ActivityLog::record('teacher.created', $teacher, $teacher->name);

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
            'password' => 'nullable|string|min:8',
            'class' => ['nullable', Rule::in(Student::CLASSES)],
        ]);

        if (empty($data['password'])) {
            unset($data['password']);
        }

        $user->update($data);

        ActivityLog::record('teacher.updated', $user, $user->name);

        return back()->with('success', __('approval.updated'));
    }

    public function import(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
        ]);

        $rows = $this->readCsv($request->file('file')->getRealPath());
        $imported = 0;
        $skipped = [];

        foreach ($rows as $index => $row) {
            $line = $index + 2;
            $name = trim((string) ($row['name'] ?? ''));
            $email = trim((string) ($row['email'] ?? ''));

            if ($name === '') {
                $skipped[] = ['line' => $line, 'reason' => 'missing_name'];

                continue;
            }

            if ($email === '') {
                $skipped[] = ['line' => $line, 'reason' => 'missing_email'];

                continue;
            }

            if (User::query()->where('email', $email)->exists()) {
                $skipped[] = ['line' => $line, 'reason' => 'duplicate_email'];

                continue;
            }

            User::create([
                'name' => $name,
                'email' => $email,
                'ic_number' => trim((string) ($row['ic_number'] ?? '')) ?: null,
                'phone' => trim((string) ($row['phone'] ?? '')) ?: null,
                'password' => trim((string) ($row['password'] ?? '')) ?: 'password123',
                'role' => UserRole::Teacher,
                'status' => AccountStatus::Active,
                'email_verified_at' => now(),
            ]);

            $imported++;
        }

        ActivityLog::record('teacher.imported', null, __('approval.imported', ['count' => $imported]), [
            'imported' => $imported,
            'skipped' => count($skipped),
        ]);

        return back()
            ->with('success', $imported > 0
                ? __('approval.imported', ['count' => $imported])
                : __('approval.nothing_imported'))
            ->with('import_report', ['imported' => $imported, 'skipped' => $skipped]);
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        abort_if($user->role !== UserRole::Teacher, 422);

        ActivityLog::record('teacher.deleted', null, $user->name);

        $user->delete();

        return back()->with('success', __('approval.deleted'));
    }

    /** Bulk delete selected teachers. */
    public function bulk(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'action' => ['required', Rule::in(['delete'])],
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:users,id'],
        ]);

        $teachers = User::query()
            ->whereIn('id', $data['ids'])
            ->where('role', UserRole::Teacher)
            ->get();

        foreach ($teachers as $teacher) {
            ActivityLog::record('teacher.deleted', null, $teacher->name, ['bulk' => true]);
            $teacher->delete();
        }

        return back()->with('success', __('approval.bulk_deleted', ['count' => $teachers->count()]));
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

    /** @return array<int, array<string, string|null>> */
    private function readCsv(string $path): array
    {
        $handle = fopen($path, 'r');

        if ($handle === false) {
            return [];
        }

        $header = fgetcsv($handle);

        if ($header === false) {
            fclose($handle);

            return [];
        }

        $header = array_map(fn ($h) => strtolower(trim((string) $h)), $header);

        $rows = [];

        while (($values = fgetcsv($handle)) !== false) {
            if (count(array_filter($values, fn ($v) => trim((string) $v) !== '')) === 0) {
                continue;
            }

            $padded = array_pad(array_slice($values, 0, count($header)), count($header), null);
            $rows[] = array_combine($header, $padded);
        }

        fclose($handle);

        return $rows;
    }
}
