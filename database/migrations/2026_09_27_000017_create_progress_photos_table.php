<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('progress_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('progress_record_id')->constrained('progress_records')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('disk', 50)->default('attendance');
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

            $table->index('student_id');
        });

        Schema::table('messages', function (Blueprint $table) {
            $table->foreignId('progress_photo_id')
                ->nullable()
                ->after('attendance_photo_id')
                ->constrained('progress_photos')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('progress_photo_id');
        });

        Schema::dropIfExists('progress_photos');
    }
};
