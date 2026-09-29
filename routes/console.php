<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Prune stored photos past the retention window (config: media.retention_days).
Schedule::command('media:prune-photos')->dailyAt('03:00');

// Remind parents about fees due within 3 days (or overdue).
Schedule::command('fees:send-reminders')->dailyAt('08:00');
