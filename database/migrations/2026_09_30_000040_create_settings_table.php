<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Editable, admin-controlled settings. A simple key/value table so adding a
 * setting needs no migration; the definitions (type, default, group) live in
 * App\Support\Settings and code reads `setting('x', config('y'))` so a missing
 * row always falls back to the shipped default.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 120)->unique();
            $table->text('value')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
