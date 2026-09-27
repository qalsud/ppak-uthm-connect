<?php

namespace App\Console\Commands;

use App\Models\AttendancePhoto;
use App\Models\Message;
use App\Models\ProgressPhoto;
use Illuminate\Console\Command;

class PrunePhotos extends Command
{
    protected $signature = 'media:prune-photos';

    protected $description = 'Delete stored photos older than the retention window';

    public function handle(): int
    {
        $days = (int) config('media.retention_days');

        if ($days <= 0) {
            $this->info('Retention is disabled; nothing to prune.');

            return self::SUCCESS;
        }

        $cutoff = now()->subDays($days);
        $pruned = 0;

        foreach ([AttendancePhoto::class, ProgressPhoto::class] as $model) {
            $model::query()
                ->where('created_at', '<', $cutoff)
                ->chunkById(100, function ($photos) use (&$pruned) {
                    foreach ($photos as $photo) {
                        // Keep a placeholder in any chat message that used it.
                        Message::withTrashed()
                            ->where(fn ($q) => $q
                                ->where('attendance_photo_id', $photo->id)
                                ->orWhere('progress_photo_id', $photo->id))
                            ->update(['photo_expired' => true]);

                        $photo->delete(); // model event removes the files
                        $pruned++;
                    }
                });
        }

        $this->info("Pruned {$pruned} photo(s) older than {$days} day(s).");

        return self::SUCCESS;
    }
}
