<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->text('allergies')->nullable()->after('withdrawn_at');
            $table->text('medical_notes')->nullable()->after('allergies');
        });

        Schema::table('attendance', function (Blueprint $table) {
            $table->decimal('temperature', 4, 1)->nullable()->after('departed_by');
            $table->string('health_note', 255)->nullable()->after('temperature');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['allergies', 'medical_notes']);
        });

        Schema::table('attendance', function (Blueprint $table) {
            $table->dropColumn(['temperature', 'health_note']);
        });
    }
};
