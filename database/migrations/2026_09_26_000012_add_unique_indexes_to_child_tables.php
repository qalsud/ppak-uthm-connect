<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One activity log / daily update per student per day.
        Schema::table('daily_activities', function (Blueprint $table) {
            $table->unique(['student_id', 'date']);
        });

        Schema::table('daily_updates', function (Blueprint $table) {
            $table->unique(['student_id', 'date']);
        });

        // One fee record per student per month.
        Schema::table('financial_records', function (Blueprint $table) {
            $table->unique(['student_id', 'month']);
        });
    }

    public function down(): void
    {
        Schema::table('daily_activities', function (Blueprint $table) {
            $table->dropUnique(['student_id', 'date']);
        });

        Schema::table('daily_updates', function (Blueprint $table) {
            $table->dropUnique(['student_id', 'date']);
        });

        Schema::table('financial_records', function (Blueprint $table) {
            $table->dropUnique(['student_id', 'month']);
        });
    }
};
