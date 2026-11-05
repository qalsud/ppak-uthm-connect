<?php

namespace App\Support;

use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Tiny CSV helpers. The import readers and streaming exports were duplicated
 * across the student/teacher/parent/audit/message controllers.
 */
class Csv
{
    /**
     * Read a CSV into rows keyed by the lower-cased header row. Blank lines are
     * skipped and short rows are padded, so a hand-edited file never crashes.
     *
     * @return array<int, array<string, string|null>>
     */
    public static function read(string $path): array
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

        $header = array_map(fn ($value) => strtolower(trim((string) $value)), $header);
        $rows = [];

        while (($values = fgetcsv($handle)) !== false) {
            if (count(array_filter($values, fn ($value) => trim((string) $value) !== '')) === 0) {
                continue;
            }

            $padded = array_pad(array_slice($values, 0, count($header)), count($header), null);
            $rows[] = array_combine($header, $padded);
        }

        fclose($handle);

        return $rows;
    }

    /**
     * Stream rows to the browser as a downloadable CSV.
     *
     * @param  array<int, string>  $headers
     * @param  iterable<int, array<int, mixed>>  $rows
     */
    public static function download(string $filename, array $headers, iterable $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($headers, $rows) {
            $out = fopen('php://output', 'w');

            fputcsv($out, $headers);

            foreach ($rows as $row) {
                fputcsv($out, $row);
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }
}
