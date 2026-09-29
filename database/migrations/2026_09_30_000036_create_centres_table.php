<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The two centres: "Tadika Khalifah Junior" and "Taska Hikmah UTHM".
 *
 * A class key (e.g. "5tahun") is only unique WITHIN a centre, so centre scoping
 * has to be present everywhere class was previously used as a lone key.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('centres', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('short_name', 60)->nullable();
            $table->string('code', 30)->unique();
            $table->text('address')->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('email')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort')->default(0);
            $table->timestamps();
        });

        // Students belong to exactly one centre.
        Schema::table('students', function (Blueprint $table) {
            $table->unsignedBigInteger('centre_id')->nullable()->after('id')->index();
        });

        // Staff may work at MORE THAN ONE centre, so the link is a pivot
        // rather than a column on users.
        Schema::create('centre_user', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('centre_id');
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['centre_id', 'user_id']);
        });

        // Memos can target a centre (audience gains a centre dimension).
        Schema::table('memos', function (Blueprint $table) {
            $table->unsignedBigInteger('centre_id')->nullable()->after('id')->index();
        });
    }

    public function down(): void
    {
        Schema::table('memos', function (Blueprint $table) {
            $table->dropColumn('centre_id');
        });

        Schema::dropIfExists('centre_user');

        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn('centre_id');
        });

        Schema::dropIfExists('centres');
    }
};
