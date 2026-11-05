<?php

namespace App\Console\Commands;

use App\Models\FinancialRecord;
use App\Models\User;
use App\Notifications\FeeReminderNotification;
use App\Support\Settings;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class SendFeeReminders extends Command
{
    protected $signature = 'fees:send-reminders {--days= : Remind when a fee is due within N days (default: settings)}';

    protected $description = 'Notify parents about fees that are due soon or already overdue';

    public function handle(): int
    {
        $days = $this->option('days') !== null
            ? (int) $this->option('days')
            : (int) setting('operations.fee_reminder_lead_days', 3);

        $until = today()->addDays($days);

        // Aggregate without loading every unpaid record into memory at once.
        $byParent = [];

        FinancialRecord::query()
            ->where('status', 'unpaid')
            ->whereNotNull('due_on')
            ->where('due_on', '<=', $until)
            ->with('student:id,parent_id')
            ->lazyById(500)
            ->each(function (FinancialRecord $record) use (&$byParent) {
                $parentId = $record->student?->parent_id;

                if (! $parentId) {
                    return;
                }

                $byParent[$parentId] ??= ['total' => 0.0, 'count' => 0];
                $byParent[$parentId]['total'] += (float) $record->amount;
                $byParent[$parentId]['count']++;
            });

        $sent = 0;
        $parents = User::query()->whereKey(array_keys($byParent))->get();

        foreach ($parents as $parent) {
            // One reminder per parent per day, even if the scheduler runs twice.
            if (! Cache::add("fee-reminder:{$parent->id}:".today()->toDateString(), true, now()->endOfDay())) {
                continue;
            }

            $parent->notify(new FeeReminderNotification(
                $byParent[$parent->id]['total'],
                $byParent[$parent->id]['count'],
            ));

            $sent++;
        }

        Settings::put('scheduler.fee_reminders_last_run', now()->toIso8601String());

        $this->info("Sent {$sent} fee reminder(s).");

        return self::SUCCESS;
    }
}
