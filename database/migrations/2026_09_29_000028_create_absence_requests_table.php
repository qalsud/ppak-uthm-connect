<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('absence_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->date('start_date');
            $table->date('end_date');
            $table->string('type', 20)->default('other'); // sick | personal | other
            $table->text('reason')->nullable();
            $table->string('status', 20)->default('pending'); // pending | approved | declined
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->string('review_note', 255)->nullable();
            $table->timestamps();

            $table->index(['student_id', 'start_date']);
            $table->index('status');
        });

        // Absence flag on an attendance day. Deliberately a plain nullable
        // column (no FK constraint) so clearing it is always allowed, and so
        // the migration works on SQLite too.
        Schema::table('attendance', function (Blueprint $table) {
            $table->unsignedBigInteger('absence_request_id')->nullable()->after('health_note')->index();
            $table->string('absence_type', 20)->nullable()->after('absence_request_id');
        });
    }

    public function down(): void
    {
        Schema::table('attendance', function (Blueprint $table) {
            $table->dropColumn(['absence_request_id', 'absence_type']);
        });

        Schema::dropIfExists('absence_requests');
    }
};
