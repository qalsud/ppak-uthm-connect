<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('date');
            $table->string('afternoon_sleep', 8)->default('no'); // yes | no
            $table->string('medication', 8)->default('no');
            $table->string('shower', 8)->default('no');
            $table->string('brush_teeth', 8)->default('no');
            $table->string('drink_milk', 8)->default('no');
            $table->string('breakfast', 8)->default('no');
            $table->string('lunch', 8)->default('no');
            $table->string('afternoon_snack', 8)->default('no');
            $table->string('eat_fruits', 8)->default('no');
            $table->string('tantrum_crying', 8)->default('no');
            $table->string('health_issues', 8)->default('no');
            $table->string('injuries', 8)->default('no');
            $table->text('treatment_notes')->nullable();
            $table->timestamps();

            $table->index(['student_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_activities');
    }
};
