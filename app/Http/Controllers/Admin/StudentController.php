<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Student;
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

        return Inertia::render('Admin/Students', [
            'students' => $students,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'age' => 'nullable|integer|min:3|max:10',
            'class' => ['required', Rule::in(Student::CLASSES)],
            'parent_id' => 'nullable|exists:users,id',
        ]);

        Student::create($data);

        return back()->with('success', __('approval.student_created'));
    }

    public function update(Request $request, Student $student): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'age' => 'nullable|integer|min:3|max:10',
            'class' => ['required', Rule::in(Student::CLASSES)],
            'parent_id' => 'nullable|exists:users,id',
        ]);

        $student->update($data);

        return back()->with('success', __('approval.updated'));
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
}
