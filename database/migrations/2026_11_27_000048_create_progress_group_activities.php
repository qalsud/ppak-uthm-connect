<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('progress_group_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('centre_id')->nullable()->constrained('centres')->nullOnDelete();
            $table->string('class', 50);
            $table->date('date');
            $table->string('sub_theme', 255)->nullable();
            $table->string('activity_done', 20)->default('Select');
            $table->string('child_proficiency', 20)->default('Select');
            $table->string('permata_activity', 20)->default('Select');
            $table->string('free_activity', 20)->default('Select');
            $table->string('development_proficiency', 30)->default('Select');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['centre_id', 'class', 'date']);
        });

        Schema::create('progress_group_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_activity_id')
                ->constrained('progress_group_activities')
                ->cascadeOnDelete();
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
        });

        Schema::table('progress_records', function (Blueprint $table) {
            $table->foreignId('group_activity_id')
                ->nullable()
                ->after('teacher_id')
                ->constrained('progress_group_activities')
                ->nullOnDelete();

            $table->index('group_activity_id');
        });
    }

    public function down(): void
    {
        Schema::table('progress_records', function (Blueprint $table) {
            $table->dropConstrainedForeignId('group_activity_id');
        });

        Schema::dropIfExists('progress_group_photos');
        Schema::dropIfExists('progress_group_activities');
    }
};
