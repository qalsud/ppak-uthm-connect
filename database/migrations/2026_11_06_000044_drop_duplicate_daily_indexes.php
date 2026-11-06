<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The unique (student_id, date) index already covers these lookups. The older
 * plain index is redundant and only adds write overhead.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('daily_activities', function (Blueprint $table) {
            $table->dropIndex(['student_id', 'date']);
        });

        Schema::table('daily_updates', function (Blueprint $table) {
            $table->dropIndex(['student_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::table('daily_activities', function (Blueprint $table) {
            $table->index(['student_id', 'date']);
        });

        Schema::table('daily_updates', function (Blueprint $table) {
            $table->index(['student_id', 'date']);
        });
    }
};
