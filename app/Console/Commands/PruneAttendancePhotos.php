<?php

namespace App\Console\Commands;

use App\Models\AttendancePhoto;
use Illuminate\Console\Command;

class PruneAttendancePhotos extends Command
{
    protected $signature = 'attendance:prune-photos';

    protected $description = 'Delete checkout photos older than the retention window';

    public function handle(): int
    {
        $days = (int) config('media.retention_days');

        if ($days <= 0) {
            $this->info('Retention is disabled; nothing to prune.');

            return self::SUCCESS;
        }

        $cutoff = now()->subDays($days);
        $pruned = 0;

        AttendancePhoto::query()
            ->where('created_at', '<', $cutoff)
            ->chunkById(100, function ($photos) use (&$pruned) {
                foreach ($photos as $photo) {
                    $photo->delete(); // model event removes the files
                    $pruned++;
                }
            });

        $this->info("Pruned {$pruned} attendance photo(s) older than {$days} day(s).");

        return self::SUCCESS;
    }
}
