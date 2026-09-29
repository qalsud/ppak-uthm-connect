<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Backfill: existing records belong to Tadika Khalifah Junior (the agreed
 * default). Idempotent — safe to run repeatedly and safe on an empty DB.
 *
 * Also seeds the two centres so a migrated (not freshly-seeded) install has
 * them without needing `db:seed`.
 */
return new class extends Migration
{
    private const CENTRES = [
        ['code' => 'khalifah-junior', 'name' => 'Tadika Khalifah Junior', 'short_name' => 'Khalifah Junior', 'sort' => 1],
        ['code' => 'taska-hikmah', 'name' => 'Taska Hikmah UTHM', 'short_name' => 'Taska Hikmah', 'sort' => 2],
    ];

    private const DEFAULT_CODE = 'khalifah-junior';

    public function up(): void
    {
        $now = now();

        foreach (self::CENTRES as $centre) {
            $exists = DB::table('centres')->where('code', $centre['code'])->exists();

            if ($exists) {
                continue;
            }

            DB::table('centres')->insert([
                'code' => $centre['code'],
                'name' => $centre['name'],
                'short_name' => $centre['short_name'],
                'sort' => $centre['sort'],
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $defaultId = DB::table('centres')->where('code', self::DEFAULT_CODE)->value('id');

        if (! $defaultId) {
            return;
        }

        // Everything that predates centres belongs to the default centre.
        DB::table('students')->whereNull('centre_id')->update(['centre_id' => $defaultId]);
        DB::table('memos')->whereNull('centre_id')->update(['centre_id' => $defaultId]);

        // Existing teachers/staff: attach to the default centre. Anyone with no
        // centre at all was previously "unrestricted", so keep that meaning.
        $staffWithClass = DB::table('users')
            ->whereIn('role', ['teacher', 'admin'])
            ->pluck('id');

        foreach ($staffWithClass as $userId) {
            $linkExists = DB::table('centre_user')
                ->where('centre_id', $defaultId)
                ->where('user_id', $userId)
                ->exists();

            if ($linkExists) {
                continue;
            }

            DB::table('centre_user')->insert([
                'centre_id' => $defaultId,
                'user_id' => $userId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        // Leave the data in place; dropping centres would orphan records.
        DB::table('students')->update(['centre_id' => null]);
        DB::table('memos')->update(['centre_id' => null]);
        DB::table('centre_user')->truncate();
        DB::table('centres')->delete();
    }
};
