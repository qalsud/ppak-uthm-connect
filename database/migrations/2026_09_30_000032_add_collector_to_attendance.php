<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance', function (Blueprint $table) {
            // Who collected the child (free text: an authorised name/id, or an
            // override note), plus the reason when it was not a listed person.
            $table->string('collected_by', 120)->nullable()->after('checkout_override_reason');
            $table->string('collector_override_reason', 255)->nullable()->after('collected_by');
        });
    }

    public function down(): void
    {
        Schema::table('attendance', function (Blueprint $table) {
            $table->dropColumn(['collected_by', 'collector_override_reason']);
        });
    }
};
