<?php

namespace Database\Seeders;

use App\Models\Centre;
use Illuminate\Database\Seeder;

class CentreSeeder extends Seeder
{
    /** The two centres, with a stable `code` used for lookups. */
    public const CENTRES = [
        [
            'code' => 'khalifah-junior',
            'name' => 'Tadika Khalifah Junior',
            'short_name' => 'Khalifah Junior',
            'sort' => 1,
        ],
        [
            'code' => 'taska-hikmah',
            'name' => 'Taska Hikmah UTHM',
            'short_name' => 'Taska Hikmah',
            'sort' => 2,
        ],
    ];

    /** Existing/historical data belongs to this centre. */
    public const DEFAULT_CODE = 'khalifah-junior';

    public function run(): void
    {
        foreach (self::CENTRES as $centre) {
            Centre::updateOrCreate(
                ['code' => $centre['code']],
                [
                    'name' => $centre['name'],
                    'short_name' => $centre['short_name'],
                    'sort' => $centre['sort'],
                    'is_active' => true,
                ],
            );
        }
    }

    /** The centre new/legacy records default to. */
    public static function defaultCentre(): ?Centre
    {
        return Centre::where('code', self::DEFAULT_CODE)->first();
    }
}
