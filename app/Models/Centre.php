<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Centre extends Model
{
    protected $fillable = [
        'name',
        'short_name',
        'code',
        'address',
        'phone',
        'email',
        'is_active',
        'sort',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort' => 'integer',
    ];

    /** Staff who work at this centre (a teacher may work at more than one). */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'centre_user');
    }

    public function students(): HasMany
    {
        return $this->hasMany(Student::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function summary(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'short_name' => $this->short_name,
            'code' => $this->code,
            'is_active' => (bool) $this->is_active,
        ];
    }
}
