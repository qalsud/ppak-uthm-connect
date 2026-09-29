<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Richer child records for a Malaysian taska/tadika: identity documents,
 * enrolment details, and the safety/medical information centres are expected
 * to hold (immunisation, blood type, dietary needs, treating doctor).
 *
 * Every column is nullable so existing students keep working untouched.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            // Identity & admin.
            $table->string('mykid', 30)->nullable()->after('name');
            $table->date('date_of_birth')->nullable()->after('mykid');
            $table->string('gender', 20)->nullable()->after('date_of_birth');
            $table->string('nationality', 60)->nullable()->after('gender');
            $table->string('ethnicity', 60)->nullable()->after('nationality');
            $table->string('religion', 60)->nullable()->after('ethnicity');
            $table->text('address')->nullable()->after('religion');
            $table->string('photo_disk', 50)->nullable()->after('address');
            $table->string('photo_path')->nullable()->after('photo_disk');
            $table->date('enrolment_date')->nullable()->after('photo_path');

            // Safety & medical.
            $table->string('blood_type', 10)->nullable()->after('medical_notes');
            $table->string('immunisation_status', 30)->nullable()->after('blood_type');
            $table->text('immunisation_notes')->nullable()->after('immunisation_status');
            $table->boolean('has_special_needs')->default(false)->after('immunisation_notes');
            $table->text('special_needs_notes')->nullable()->after('has_special_needs');
            $table->text('dietary_restrictions')->nullable()->after('special_needs_notes');
            $table->string('doctor_name', 150)->nullable()->after('dietary_restrictions');
            $table->string('doctor_phone', 40)->nullable()->after('doctor_name');

            // PDPA: health data is sensitive and needs explicit guardian consent.
            $table->boolean('medical_consent')->default(false)->after('doctor_phone');
            $table->timestamp('medical_consent_at')->nullable()->after('medical_consent');

            $table->index('mykid');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropIndex(['mykid']);
            $table->dropColumn([
                'mykid', 'date_of_birth', 'gender', 'nationality', 'ethnicity', 'religion',
                'address', 'photo_disk', 'photo_path', 'enrolment_date',
                'blood_type', 'immunisation_status', 'immunisation_notes',
                'has_special_needs', 'special_needs_notes', 'dietary_restrictions',
                'doctor_name', 'doctor_phone', 'medical_consent', 'medical_consent_at',
            ]);
        });
    }
};
