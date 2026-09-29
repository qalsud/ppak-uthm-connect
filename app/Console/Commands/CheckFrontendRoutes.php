<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

/**
 * Guards against frontend actions pointing at route names that do not exist —
 * a class of bug that only shows up when a user clicks the button.
 */
class CheckFrontendRoutes extends Command
{
    protected $signature = 'check:routes';

    protected $description = 'Verify every route() name used in the frontend is registered';

    public function handle(): int
    {
        $registered = collect(app('router')->getRoutes())
            ->map(fn ($r) => $r->getName())
            ->filter()
            ->all();

        $used = [];

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator(resource_path('js'))
        );

        foreach ($iterator as $file) {
            if (! $file->isFile() || ! in_array($file->getExtension(), ['tsx', 'ts'], true)) {
                continue;
            }

            $src = file_get_contents($file->getPathname());
            $name = $file->getFilename();

            if (preg_match_all("/route\(\s*['\"]([a-z0-9_.\-]+)['\"]/i", $src, $m)) {
                foreach ($m[1] as $route) {
                    $used[$route][] = $name;
                }
            }

            if (preg_match_all("/actionRoute\(\s*[^,]+,\s*'([a-z0-9_.\-]+)'/i", $src, $m)) {
                foreach ($m[1] as $suffix) {
                    $used['teacher.'.$suffix][] = $name;
                    $used['admin.register.'.$suffix][] = $name;
                }
            }
        }

        $missing = [];
        foreach ($used as $route => $sources) {
            if (! in_array($route, $registered, true)) {
                $missing[$route] = array_unique($sources);
            }
        }

        if (empty($missing)) {
            $this->info('OK: every frontend route name is registered ('.count($used).' checked).');

            return self::SUCCESS;
        }

        $this->error('Route names referenced in the frontend but not registered:');
        foreach ($missing as $route => $sources) {
            $this->line("  {$route}  <- ".implode(', ', $sources));
        }

        return self::FAILURE;
    }
}
