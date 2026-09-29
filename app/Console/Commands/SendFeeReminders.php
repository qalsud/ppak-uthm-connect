<?php

namespace App\Console\Commands;

use App\Models\FinancialRecord;
use App\Notifications\FeeReminderNotification;
use Illuminate\Console\Command;

class SendFeeReminders extends Command
{
    protected $signature = 'fees:send-reminders {--days=3 : Remind when a fee is due within N days}';

    protected $description = 'Notify parents about fees that are due soon or already overdue';

    public function handle(): int
    {
        $until = today()->addDays((int) $this->option('days'));

        $byParent = FinancialRecord::query()
            ->where('status', 'unpaid')
            ->whereNotNull('due_on')
            ->where('due_on', '<=', $until)
            ->with('student.parent')
            ->get()
            ->filter(fn (FinancialRecord $record) => $record->student?->parent_id !== null)
            ->groupBy(fn (FinancialRecord $record) => $record->student->parent_id);

        $sent = 0;

        foreach ($byParent as $records) {
            $parent = $records->first()->student->parent;

            if (! $parent) {
                continue;
            }

            $parent->notify(new FeeReminderNotification(
                (float) $records->sum('amount'),
                $records->count(),
            ));

            $sent++;
        }

        $this->info("Sent {$sent} fee reminder(s).");

        return self::SUCCESS;
    }
}
