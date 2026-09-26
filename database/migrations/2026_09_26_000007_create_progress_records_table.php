<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('progress_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('date');
            $table->string('sub_theme', 255)->nullable();
            $table->string('activity_done', 20)->default('Select'); // Select|Good|Average|Poor
            $table->string('child_proficiency', 20)->default('Select');
            $table->string('permata_activity', 20)->default('Select'); // Drawing|Coloring|Crafting|Reading|Writing
            $table->string('free_activity', 20)->default('Select'); // Learning|Playing|Reading|Drawing|Other
            $table->string('development_proficiency', 30)->default('Select'); // Creativity Innovation|Social Skills|Motor Skills|Language Skills|Cognitive Skills
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['student_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('progress_records');
    }
};
