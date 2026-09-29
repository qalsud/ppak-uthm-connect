<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Early checkouts stored the raw collector option id (e.g. "guardian-1")
 * instead of the person's name. Rewrite those to the display name.
 */
return new class extends Migration
{
    public function up(): void
    {
        $rows = DB::table('attendance')
            ->whereNotNull('collected_by')
            ->where(function ($q) {
                $q->where('collected_by', 'like', 'guardian-%')
                    ->orWhere('collected_by', 'like', 'collector-%');
            })
            ->get(['id', 'collected_by']);

        foreach ($rows as $row) {
            [$type, $id] = explode('-', $row->collected_by, 2);

            $name = $type === 'guardian'
                ? DB::table('guardians')->where('id', $id)->value('name')
                : DB::table('authorised_collectors')->where('id', $id)->value('name');

            if ($name) {
                DB::table('attendance')->where('id', $row->id)->update(['collected_by' => $name]);
            }
        }
    }

    public function down(): void
    {
        // Not reversible — the original ids are not recoverable after rewriting.
    }
};
