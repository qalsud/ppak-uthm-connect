<?php

namespace App\Services\Reports;

use App\Models\ProgressRecord;
use App\Models\Student;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Builds a per-child progress report (data + PDF) from existing progress
 * records, optionally scoped to a period. Shared by the teacher/admin register
 * and the parent portal so the report can never drift between roles.
 */
class ProgressReport
{
    /**
     * @return Collection<int, ProgressRecord>
     */
    public function records(Student $student, ?string $from, ?string $to): Collection
    {
        return $student->progressRecords()
            ->with('teacher:id,name')
            ->when($from, fn ($query) => $query->whereDate('date', '>=', Carbon::parse($from)))
            ->when($to, fn ($query) => $query->whereDate('date', '<=', Carbon::parse($to)))
            ->orderBy('date')
            ->get();
    }

    /**
     * @return array<string, mixed>
     */
    public function data(Student $student, ?string $from, ?string $to): array
    {
        $student->loadMissing(['centre', 'parent:id,name']);

        $records = $this->records($student, $from, $to);

        return [
            'student' => $student,
            'records' => $records,
            'from' => $from ? Carbon::parse($from) : null,
            'to' => $to ? Carbon::parse($to) : null,
            'issuedAt' => now(),
            'counts' => [
                'total' => $records->count(),
                'good' => $records->where('child_proficiency', 'Good')->count(),
                'average' => $records->where('child_proficiency', 'Average')->count(),
                'poor' => $records->where('child_proficiency', 'Poor')->count(),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function pdf(array $data): DomPdf
    {
        return Pdf::loadView('pdf.progress-report', $data)->setPaper('a4', 'landscape');
    }
}
