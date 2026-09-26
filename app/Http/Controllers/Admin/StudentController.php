<?php

namespace App\Http\Controllers\Admin;

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

class StudentController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $class = $request->query('class');

        $students = Student::query()
            ->with('parent:id,name')
            ->when($search !== '', fn ($q) => $q->where(function ($w) use ($search) {
                $w->where('name', 'like', "%{$search}%")
                    ->orWhereHas('parent', fn ($p) => $p->where('name', 'like', "%{$search}%"));
            }))
            ->when(in_array($class, Student::CLASSES, true), fn ($q) => $q->where('class', $class))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        $parents = User::query()
            ->where('role', UserRole::Parent)
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        return Inertia::render('Admin/Students', [
            'students' => $students,
            'parents' => $parents,
            'filters' => ['search' => $search, 'class' => $class ?? ''],
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

    public function destroy(Request $request, Student $student): RedirectResponse
    {
        ActivityLog::record('student.deleted', null, $student->name);

        $student->delete();

        return back()->with('success', __('approval.deleted'));
    }

    /**
     * @return array{name: string, age: int|null, class: string, parent_id: int|null}
     */
    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => 'required|string|max:255',
            'age' => 'nullable|integer|min:3|max:10',
            'class' => ['required', Rule::in(Student::CLASSES)],
            'parent_id' => [
                'nullable',
                Rule::exists('users', 'id')->where('role', UserRole::Parent->value),
            ],
        ]);
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
