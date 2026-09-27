<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->string('type', 20)->default('user')->after('body'); // user | system
            $table->timestamp('edited_at')->nullable()->after('read_at');
            $table->softDeletes();
            $table->boolean('photo_expired')->default(false)->after('deleted_at');
        });

        Schema::create('message_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained('messages')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('disk', 50)->default('attendance');
            $table->string('path');
            $table->string('thumb_path')->nullable();
            $table->string('original_name')->nullable();
            $table->string('mime', 50)->default('image/jpeg');
            $table->unsignedInteger('size')->nullable();
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('student_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('notify_email_messages')->default(false)->after('class');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('message_attachments');

        Schema::table('messages', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->dropColumn(['type', 'edited_at', 'photo_expired']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('notify_email_messages');
        });
    }
};
