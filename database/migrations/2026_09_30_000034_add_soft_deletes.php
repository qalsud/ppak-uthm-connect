<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Soft deletes so admin mistakes are recoverable. Children already archive via
 * status; these are the other records an admin can remove.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['financial_records', 'memos', 'guardians', 'emergency_contacts', 'authorised_collectors', 'absence_requests'] as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->softDeletes();
            });
        }
    }

    public function down(): void
    {
        foreach (['financial_records', 'memos', 'guardians', 'emergency_contacts', 'authorised_collectors', 'absence_requests'] as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->dropSoftDeletes();
            });
        }
    }
};
