<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance', function (Blueprint $table) {
            $table->string('checkout_note', 255)->nullable()->after('departed_by');
            $table->boolean('checkout_photo_override')->default(false)->after('checkout_note');
            $table->string('checkout_override_reason', 255)->nullable()->after('checkout_photo_override');
        });
    }

    public function down(): void
    {
        Schema::table('attendance', function (Blueprint $table) {
            $table->dropColumn([
                'checkout_note',
                'checkout_photo_override',
                'checkout_override_reason',
            ]);
        });
    }
};
