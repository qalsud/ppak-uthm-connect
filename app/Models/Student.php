<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Student extends Model
{
    protected $fillable = [
        'parent_id',
        'name',
        'age',
        'class',
    ];

    public const CLASSES = ['5tahun', '6bintang'];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'parent_id');
    }

    public function financialRecords(): HasMany
    {
        return $this->hasMany(FinancialRecord::class);
    }

    // Future modules attach here:
    // public function dailyActivities(): HasMany ...
    // public function progressRecords(): HasMany ...
    // public function financialRecords(): HasMany ...

    public function getClassLabelAttribute(): string
    {
        return match ($this->class) {
            '5tahun' => '5 Tahun',
            '6bintang' => '6 Bintang',
            default => strtoupper($this->class),
        };
    }
}
