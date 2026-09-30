<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Refund bookkeeping for online (Stripe) payments.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('refund_id', 255)->nullable()->after('stripe_session_id');
            $table->decimal('refunded_amount', 10, 2)->nullable()->after('refund_id');
            $table->string('refund_reason', 255)->nullable()->after('refunded_amount');
            $table->timestamp('refunded_at')->nullable()->after('paid_at');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['refund_id', 'refunded_amount', 'refund_reason', 'refunded_at']);
        });
    }
};
