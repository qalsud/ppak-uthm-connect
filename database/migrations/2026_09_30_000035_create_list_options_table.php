<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One table for every "fixed list" the centre should be able to edit itself:
 * classes, blood types, immunisation statuses, guardian relationships, absence
 * types, activity fields, progress options, and so on.
 *
 * A single keyed table (rather than one table per list) means adding a new
 * manageable list later needs no migration.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('list_options', function (Blueprint $table) {
            $table->id();
            $table->string('group', 60);            // e.g. 'class', 'blood_type'
            $table->string('key', 60);              // stored value, e.g. '5tahun'
            $table->string('label', 120);           // display label
            $table->string('meta', 120)->nullable(); // optional extra (e.g. hex tint)
            $table->unsignedInteger('sort')->default(0);
            $table->boolean('is_active')->default(true);
            // Managed lists are global for now; Phase G scopes them per centre.
            $table->unsignedBigInteger('centre_id')->nullable()->index();
            $table->timestamps();

            $table->unique(['group', 'key', 'centre_id']);
            $table->index(['group', 'is_active', 'sort']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('list_options');
    }
};
