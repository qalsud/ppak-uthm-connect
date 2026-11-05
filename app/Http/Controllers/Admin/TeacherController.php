<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Centre;
use App\Models\Student;
use App\Models\User;
use App\Support\AccountQuery;
use App\Support\AccountRules;
use App\Support\Csv;
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
        $centre = $request->query('centre');
        $centreId = is_numeric($centre) ? (int) $centre : null;

        $teachers = AccountQuery::for(UserRole::Teacher, $status, $search)
            ->with('centres:id')
            ->when(in_array($class, Student::classKeys(), true), fn ($q) => $q->where('class', $class))
            ->when($centreId, fn ($q) => $q->whereHas('centres', fn ($c) => $c->where('centres.id', $centreId)))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        $teachers->getCollection()->transform(function (User $teacher) {
            $teacher->setAttribute('centre_ids', $teacher->centres->pluck('id')->all());

            return $teacher;
        });

        return Inertia::render('Admin/Teachers', [
            'teachers' => $teachers,
            'counts' => AccountQuery::counts(
                UserRole::Teacher,
                fn ($query) => $query->when(
                    $centreId,
                    fn ($q) => $q->whereHas('centres', fn ($c) => $c->where('centres.id', $centreId)),
                ),
            ),
            'filters' => ['status' => $status ?? '', 'search' => $search, 'class' => $class ?? '', 'centre' => $centre ?? ''],
            'classes' => Student::classKeys(),
            'centres' => Centre::active()->orderBy('sort')->get(['id', 'name', 'short_name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            ...AccountRules::write(),
            'class' => ['nullable', Rule::in(Student::classKeys())],
            'centre_ids' => ['nullable', 'array'],
            'centre_ids.*' => ['integer', Rule::exists('centres', 'id')],
        ]);

        $centreIds = $data['centre_ids'] ?? [];
        unset($data['centre_ids']);

        $teacher = User::create([
            ...$data,
            'role' => UserRole::Teacher,
            'status' => AccountStatus::Active,
            'email_verified_at' => now(),
        ]);

        // A teacher may work at more than one centre.
        $teacher->centres()->sync($centreIds);

        ActivityLog::record('teacher.created', $teacher, $teacher->name, ['centres' => $centreIds]);

        return back()->with('success', __('approval.teacher_created'));
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        abort_if($user->role !== UserRole::Teacher, 422);

        $data = $request->validate([
            ...AccountRules::write($user, requirePassword: false),
            'status' => AccountRules::status(),
            'class' => ['nullable', Rule::in(Student::classKeys())],
            'centre_ids' => ['nullable', 'array'],
            'centre_ids.*' => ['integer', Rule::exists('centres', 'id')],
        ]);

        if (empty($data['password'])) {
            unset($data['password']);
        }

        $centreIds = $data['centre_ids'] ?? [];
        unset($data['centre_ids']);

        $user->update($data);
        $user->centres()->sync($centreIds);

        ActivityLog::record('teacher.updated', $user, $user->name);

        return back()->with('success', __('approval.updated'));
    }

    public function import(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
        ]);

        $rows = Csv::read($request->file('file')->getRealPath());
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

        return Csv::download(
            'teachers.csv',
            ['Name', 'IC', 'Phone', 'Email', 'Status'],
            $teachers->map(fn (User $teacher) => [
                $teacher->name,
                $teacher->ic_number ?? '',
                $teacher->phone ?? '',
                $teacher->email,
                $teacher->status->value,
            ]),
        );
    }
}
