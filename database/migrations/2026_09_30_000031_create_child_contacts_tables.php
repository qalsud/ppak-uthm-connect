<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Safety-critical people around a child: guardians (a child may have a mother
 * AND a father, plus a legal guardian), ordered emergency contacts, and the
 * adults authorised to collect the child.
 *
 * Deliberately separate from `users`: a guardian need not have a portal
 * account, and an emergency contact or collector usually will not.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guardians', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('relationship', 40); // mother | father | guardian | other
            $table->string('ic_number', 30)->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('email')->nullable();
            $table->string('occupation', 120)->nullable();
            $table->boolean('is_primary')->default(false);
            $table->boolean('can_collect')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['student_id', 'is_primary']);
        });

        Schema::create('emergency_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('name');
            $table->string('relationship', 40)->nullable();
            $table->string('phone', 40);
            $table->unsignedTinyInteger('priority')->default(1); // 1 = first to call
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['student_id', 'priority']);
        });

        Schema::create('authorised_collectors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('name');
            $table->string('relationship', 40)->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('ic_number', 30)->nullable();
            $table->string('photo_disk', 50)->nullable();
            $table->string('photo_path')->nullable();
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['student_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('authorised_collectors');
        Schema::dropIfExists('emergency_contacts');
        Schema::dropIfExists('guardians');
    }
};
