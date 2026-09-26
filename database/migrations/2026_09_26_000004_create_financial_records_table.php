<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('financial_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->string('month');
            $table->decimal('amount', 10, 2);
            $table->decimal('overtime_hours', 5, 2)->default(0);
            $table->string('status')->default('unpaid'); // unpaid | paid
            $table->date('paid_on')->nullable();
            $table->string('stripe_session_id', 255)->nullable();
            $table->boolean('ReceiptGenerated')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('financial_records');
    }
};
