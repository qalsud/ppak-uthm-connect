<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('absence_attachments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('absence_request_id')->index();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('disk', 50);
            $table->string('path');
            $table->string('thumb_path')->nullable();
            $table->string('original_name');
            $table->string('mime', 100);
            $table->unsignedBigInteger('size')->default(0);
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['absence_request_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('absence_attachments');
    }
};
