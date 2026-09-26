<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_updates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->date('date');
            $table->time('arrival_time')->nullable();
            $table->string('sleep_status', 20)->default('Good');  // Good | Poor
            $table->string('bath_status', 20)->default('Done');   // Done | Not Done
            $table->string('health_status', 50)->nullable();
            $table->text('parent_notes')->nullable();
            $table->timestamps();

            $table->index(['student_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_updates');
    }
};
