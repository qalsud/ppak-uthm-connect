<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Attendance;
use App\Models\DailyActivity;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class StudentController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $class = $request->query('class');
        $status = $request->query('status', 'active');

        $students = Student::query()
            ->with('parent:id,name')
            ->when($search !== '', fn ($q) => $q->where(function ($w) use ($search) {
                $w->where('name', 'like', "%{$search}%")
                    ->orWhereHas('parent', fn ($p) => $p->where('name', 'like', "%{$search}%"));
            }))
            ->when(in_array($class, Student::CLASSES, true), fn ($q) => $q->where('class', $class))
            ->when(in_array($status, Student::STATUSES, true), fn ($q) => $q->where('status', $status))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        $parents = User::query()
            ->where('role', UserRole::Parent)
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        $counts = Student::query()
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return Inertia::render('Admin/Students', [
            'students' => $students,
            'parents' => $parents,
            'counts' => [
                'all' => (int) $counts->sum(),
                ...collect(Student::STATUSES)->mapWithKeys(fn ($s) => [$s => (int) $counts->get($s, 0)])->all(),
            ],
            'filters' => ['search' => $search, 'class' => $class ?? '', 'status' => $status],
        ]);
    }

    public function show(Student $student): Response
    {
        $student->load(['parent:id,name,email', 'guardians', 'emergencyContacts', 'authorisedCollectors']);

        return Inertia::render('Admin/Student', [
            'student' => [
                'id' => $student->id,
                'name' => $student->name,
                'age' => $student->age,
                'class' => $student->classLabel,
                'parent' => $student->parent ? [
                    'id' => $student->parent->id,
                    'name' => $student->parent->name,
                    'email' => $student->parent->email,
                ] : null,
                'unpaid' => (float) $student->financialRecords()->where('status', 'unpaid')->sum('amount'),
            ],
            'profile' => $student->profile(),
            'contacts' => $student->contacts(),
            'collectorOptions' => $student->collectorOptions(),
            'attendance' => Attendance::historyFor($student->id, 14)
                ->map(fn (Attendance $a) => $a->historyRow())
                ->values(),
            'updates' => $student->dailyUpdates()
                ->latest('date')
                ->limit(5)
                ->get(['id', 'date', 'arrival_time', 'sleep_status', 'bath_status', 'health_status', 'parent_notes']),
            'activities' => $student->dailyActivities()
                ->with('teacher:id,name')
                ->latest('date')
                ->limit(5)
                ->get(),
            'progress' => $student->progressRecords()
                ->with('photos.uploadedBy:id,name')
                ->latest('date')
                ->limit(5)
                ->get(),
            'payments' => $student->financialRecords()
                ->latest('created_at')
                ->limit(8)
                ->get(['id', 'month', 'amount', 'status', 'paid_on']),
            'fields' => DailyActivity::FIELDS,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $student = Student::create($this->validated($request));

        ActivityLog::record('student.created', $student, $student->name);

        return back()->with('success', __('approval.student_created'));
    }

    public function update(Request $request, Student $student): RedirectResponse
    {
        $student->update($this->validated($request));

        ActivityLog::record('student.updated', $student, $student->name);

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
            $line = $index + 2; // +1 for zero-index, +1 for the header row
            $name = trim((string) ($row['name'] ?? ''));

            if ($name === '') {
                $skipped[] = ['line' => $line, 'reason' => 'missing_name'];

                continue;
            }

            $class = $this->normaliseClass($row['class'] ?? null);

            if ($class === null) {
                $skipped[] = ['line' => $line, 'reason' => 'invalid_class'];

                continue;
            }

            $email = trim((string) ($row['parent_email'] ?? ''));
            $parent = $email === ''
                ? null
                : User::query()->where('email', $email)->where('role', UserRole::Parent)->first();

            Student::create([
                'name' => $name,
                'age' => is_numeric($row['age'] ?? null) ? (int) $row['age'] : null,
                'class' => $class,
                'parent_id' => $parent?->id,
            ]);

            $imported++;
        }

        ActivityLog::record('student.imported', null, __('approval.imported', ['count' => $imported]), [
            'imported' => $imported,
            'skipped' => count($skipped),
        ]);

        return back()
            ->with('success', $imported > 0
                ? __('approval.imported', ['count' => $imported])
                : __('approval.nothing_imported'))
            ->with('import_report', ['imported' => $imported, 'skipped' => $skipped]);
    }

    public function export()
    {
        $students = Student::query()->with('parent:id,name')->orderBy('name')->get();

        return response()->streamDownload(function () use ($students) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Name', 'Age', 'Class', 'Parent']);

            foreach ($students as $student) {
                fputcsv($out, [
                    $student->name,
                    $student->age,
                    $student->class_label,
                    $student->parent?->name ?? '',
                ]);
            }

            fclose($out);
        }, 'students.csv', ['Content-Type' => 'text/csv']);
    }

    /**
     * A child is never hard-deleted: attendance, payments, progress photos and
     * chat history are historical records. Deleting here archives instead, so
     * nothing can be destroyed by a mis-click.
     */
    public function destroy(Request $request, Student $student): RedirectResponse
    {
        if (! $student->isActive()) {
            return back()->with('success', __('approval.already_archived'));
        }

        $student->update(['status' => 'withdrawn', 'withdrawn_at' => now()]);

        ActivityLog::record('student.archived', $student, $student->name, ['via' => 'delete_action']);

        return back()->with('success', __('approval.archived_instead'));
    }

    /** Archive (withdraw/graduate) or restore a student. */
    public function status(Request $request, Student $student): RedirectResponse
    {
        $status = $request->validate([
            'status' => ['required', Rule::in(Student::STATUSES)],
        ])['status'];

        $student->update([
            'status' => $status,
            'withdrawn_at' => $status === 'active' ? null : now(),
        ]);

        ActivityLog::record('student.status', $student, $student->name, ['status' => $status]);

        return back()->with('success', __('approval.updated'));
    }

    /** Bulk archive, or restore. Children are never permanently deleted. */
    public function bulk(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'action' => ['required', Rule::in(['withdraw', 'restore'])],
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'exists:students,id'],
        ]);

        $students = Student::query()
            ->whereIn('id', $data['ids'])
            ->when($data['action'] === 'withdraw', fn ($q) => $q->where('status', 'active'))
            ->when($data['action'] === 'restore', fn ($q) => $q->where('status', '!=', 'active'))
            ->get();

        foreach ($students as $student) {
            $status = $data['action'] === 'withdraw' ? 'withdrawn' : 'active';

            $student->update([
                'status' => $status,
                'withdrawn_at' => $status === 'active' ? null : now(),
            ]);

            ActivityLog::record('student.status', $student, $student->name, [
                'status' => $status,
                'bulk' => true,
            ]);
        }

        return back()->with('success', $data['action'] === 'withdraw'
            ? __('approval.bulk_archived', ['count' => $students->count()])
            : __('approval.bulk_restored', ['count' => $students->count()]));
    }

    /**
     * @return array{name: string, age: int|null, class: string, parent_id: int|null}
     */
    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'age' => 'nullable|integer|min:3|max:10',
            'class' => ['required', Rule::in(Student::CLASSES)],
            'parent_id' => [
                'nullable',
                Rule::exists('users', 'id')->where('role', UserRole::Parent->value),
            ],

            // Identity & admin.
            'mykid' => ['nullable', 'string', 'max:30'],
            'date_of_birth' => ['nullable', 'date', 'before_or_equal:today'],
            'gender' => ['nullable', Rule::in(Student::GENDERS)],
            'nationality' => ['nullable', Rule::in(Student::NATIONALITIES)],
            'ethnicity' => ['nullable', 'string', 'max:60'],
            'religion' => ['nullable', 'string', 'max:60'],
            'address' => ['nullable', 'string', 'max:1000'],
            'enrolment_date' => ['nullable', 'date', 'before_or_equal:today'],

            // Safety & medical.
            'allergies' => ['nullable', 'string', 'max:1000'],
            'medical_notes' => ['nullable', 'string', 'max:1000'],
            'blood_type' => ['nullable', Rule::in(Student::BLOOD_TYPES)],
            'immunisation_status' => ['nullable', Rule::in(Student::IMMUNISATION_STATUSES)],
            'immunisation_notes' => ['nullable', 'string', 'max:1000'],
            'has_special_needs' => ['nullable', 'boolean'],
            'special_needs_notes' => ['nullable', 'string', 'max:1000'],
            'dietary_restrictions' => ['nullable', 'string', 'max:1000'],
            'doctor_name' => ['nullable', 'string', 'max:150'],
            'doctor_phone' => ['nullable', 'string', 'max:40'],
            'medical_consent' => ['nullable', 'boolean'],
        ]);

        // Stamp when consent was first granted (PDPA: health data is sensitive).
        if (! empty($data['medical_consent'])) {
            $existing = $request->route('student');
            $data['medical_consent_at'] = $existing?->medical_consent_at ?? now();
        } else {
            $data['medical_consent'] = false;
            $data['medical_consent_at'] = null;
        }

        $data['has_special_needs'] = (bool) ($data['has_special_needs'] ?? false);

        return $data;
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

        $header = array_map(
            fn ($h) => strtolower(trim((string) $h)),
            $header
        );

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

    private function normaliseClass(?string $value): ?string
    {
        $value = strtolower(trim((string) $value));

        if ($value === '') {
            return null;
        }

        return match (true) {
            str_contains($value, '5') => '5tahun',
            str_contains($value, '6') => '6bintang',
            default => null,
        };
    }
}
