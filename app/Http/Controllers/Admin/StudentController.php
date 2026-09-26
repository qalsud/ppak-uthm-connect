<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class StudentController extends Controller
{
    public function index(): Response
    {
        $students = Student::query()
            ->with('parent:id,name')
            ->orderBy('name')
            ->get();

        $parents = User::query()
            ->where('role', UserRole::Parent)
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        return Inertia::render('Admin/Students', [
            'students' => $students,
            'parents' => $parents,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Student::create($this->validated($request));

        return back()->with('success', __('approval.student_created'));
    }

    public function update(Request $request, Student $student): RedirectResponse
    {
        $student->update($this->validated($request));

        return back()->with('success', __('approval.updated'));
    }

    public function import(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:2048'],
        ]);

        $rows = $this->readCsv($request->file('file')->getRealPath());
        $created = 0;

        foreach ($rows as $row) {
            $name = trim((string) ($row['name'] ?? ''));

            if ($name === '') {
                continue;
            }

            $class = $this->normaliseClass($row['class'] ?? null);

            if ($class === null) {
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

            $created++;
        }

        return back()->with('success', __('approval.imported', ['count' => $created]));
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
