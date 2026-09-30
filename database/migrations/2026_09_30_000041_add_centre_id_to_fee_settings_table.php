<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-centre fee rates (G-i5). `centre_id` null = the shared/global rate; a
 * non-null row overrides it for that centre.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fee_settings', function (Blueprint $table) {
            $table->unsignedBigInteger('centre_id')->nullable()->after('id')->index();
        });
    }

    public function down(): void
    {
        Schema::table('fee_settings', function (Blueprint $table) {
            $table->dropColumn('centre_id');
        });
    }
};
