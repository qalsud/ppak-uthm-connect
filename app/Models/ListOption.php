<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * An editable option in one of the centre's "fixed lists" (classes, blood
 * types, relationships, …). See App\Support\Lists for the groups.
 */
class ListOption extends Model
{
    protected $fillable = [
        'group',
        'key',
        'label',
        'meta',
        'sort',
        'is_active',
        'centre_id',
    ];

    protected $casts = [
        'sort' => 'integer',
        'is_active' => 'boolean',
    ];

    /**
     * The centre this option belongs to. Phase G scopes lists per centre; until
     * the `centres` table exists this simply returns null.
     */
    public function centre(): BelongsTo
    {
        return $this->belongsTo(Centre::class);
    }
}
