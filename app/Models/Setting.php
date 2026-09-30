<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A single admin-editable setting (key/value). See App\Support\Settings for
 * the registry of known keys, their types and defaults.
 */
class Setting extends Model
{
    protected $fillable = [
        'key',
        'value',
    ];
}
