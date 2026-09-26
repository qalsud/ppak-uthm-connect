<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_id')->constrained('attendance')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('type', 20)->default('checkout'); // checkout | checkin
            $table->string('disk', 50)->default('local');
            $table->string('path');
            $table->string('thumb_path')->nullable();
            $table->string('original_name')->nullable();
            $table->string('mime', 50)->default('image/jpeg');
            $table->unsignedInteger('size')->nullable();
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->string('note', 255)->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['attendance_id', 'type']);
            $table->index('student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_photos');
    }
};
