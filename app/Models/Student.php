<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Student extends Model
{
    use HasFactory;

    protected $fillable = [
        'parent_id',
        'name',
        'age',
        'class',
        'status',
        'withdrawn_at',
        'allergies',
        'medical_notes',
    ];

    public const CLASSES = ['5tahun', '6bintang'];

    /** active | withdrawn | graduated */
    public const STATUSES = ['active', 'withdrawn', 'graduated'];

    protected $casts = [
        'withdrawn_at' => 'datetime',
    ];

    /** Children currently enrolled. */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'parent_id');
    }

    public function financialRecords(): HasMany
    {
        return $this->hasMany(FinancialRecord::class);
    }

    public function dailyActivities(): HasMany
    {
        return $this->hasMany(DailyActivity::class);
    }

    public function dailyUpdates(): HasMany
    {
        return $this->hasMany(DailyUpdate::class);
    }

    public function progressRecords(): HasMany
    {
        return $this->hasMany(ProgressRecord::class);
    }

    public function medicationRequests(): HasMany
    {
        return $this->hasMany(MedicationRequest::class);
    }

    public function growthRecords(): HasMany
    {
        return $this->hasMany(GrowthRecord::class);
    }

    public function absenceRequests(): HasMany
    {
        return $this->hasMany(AbsenceRequest::class);
    }

    // Future modules attach here:
    // public function dailyActivities(): HasMany ...
    // public function progressRecords(): HasMany ...
    // public function financialRecords(): HasMany ...

    public function getClassLabelAttribute(): string
    {
        return static::classLabelStatic($this->class);
    }

    public static function classLabelStatic(string $class): string
    {
        return match ($class) {
            '5tahun' => '5 Tahun',
            '6bintang' => '6 Bintang',
            default => strtoupper($class),
        };
    }
}
