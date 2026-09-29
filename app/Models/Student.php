<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class Student extends Model
{
    use HasFactory;

    protected $fillable = [
        'parent_id',
        'name',
        'mykid',
        'date_of_birth',
        'gender',
        'nationality',
        'ethnicity',
        'religion',
        'address',
        'photo_disk',
        'photo_path',
        'enrolment_date',
        'age',
        'class',
        'status',
        'withdrawn_at',
        'allergies',
        'medical_notes',
        'blood_type',
        'immunisation_status',
        'immunisation_notes',
        'has_special_needs',
        'special_needs_notes',
        'dietary_restrictions',
        'doctor_name',
        'doctor_phone',
        'medical_consent',
        'medical_consent_at',
    ];

    public const CLASSES = ['5tahun', '6bintang'];

    /** active | withdrawn | graduated */
    public const STATUSES = ['active', 'withdrawn', 'graduated'];

    public const GENDERS = ['male', 'female'];

    /** malaysian | non_malaysian */
    public const NATIONALITIES = ['malaysian', 'non_malaysian'];

    /** complete | partial | none | exempt | unknown */
    public const IMMUNISATION_STATUSES = ['complete', 'partial', 'none', 'exempt', 'unknown'];

    public const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    protected $casts = [
        'withdrawn_at' => 'datetime',
        'date_of_birth' => 'date:Y-m-d',
        'enrolment_date' => 'date:Y-m-d',
        'has_special_needs' => 'boolean',
        'medical_consent' => 'boolean',
        'medical_consent_at' => 'datetime',
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

    /**
     * Age in whole years. Prefers the date of birth; falls back to the legacy
     * `age` column so records created before DOB existed still report an age.
     */
    public function getAgeAttribute(): ?int
    {
        $dob = $this->attributes['date_of_birth'] ?? null;

        if ($dob) {
            return (int) Carbon::parse($dob)->age;
        }

        return isset($this->attributes['age']) ? (int) $this->attributes['age'] : null;
    }

    public function hasPhoto(): bool
    {
        return (bool) $this->photo_path;
    }

    /** Authorised URL to the child's photo, or null when none is stored. */
    public function getPhotoUrlAttribute(): ?string
    {
        return $this->photo_path
            ? route('student.photos.show', $this->id)
            : null;
    }

    /**
     * Safety-critical facts a teacher needs at a glance. Deliberately short —
     * this feeds the warning strip on registers, not a full medical record.
     *
     * @return array<int, string>
     */
    public function alerts(): array
    {
        $alerts = [];

        if (filled($this->allergies)) {
            $alerts[] = 'allergies';
        }

        if ($this->has_special_needs) {
            $alerts[] = 'special_needs';
        }

        if (filled($this->dietary_restrictions)) {
            $alerts[] = 'dietary';
        }

        if (filled($this->medical_notes) || filled($this->doctor_name)) {
            $alerts[] = 'medical';
        }

        return $alerts;
    }

    /** Shape used by the admin/parent record views. */
    public function profile(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'mykid' => $this->mykid,
            'date_of_birth' => $this->date_of_birth?->format('Y-m-d'),
            'age' => $this->age,
            'gender' => $this->gender,
            'nationality' => $this->nationality,
            'ethnicity' => $this->ethnicity,
            'religion' => $this->religion,
            'address' => $this->address,
            'photo_url' => $this->photo_url,
            'enrolment_date' => $this->enrolment_date?->format('Y-m-d'),
            'class' => $this->class,
            'class_label' => $this->class_label,
            'status' => $this->status,
            'allergies' => $this->allergies,
            'medical_notes' => $this->medical_notes,
            'blood_type' => $this->blood_type,
            'immunisation_status' => $this->immunisation_status,
            'immunisation_notes' => $this->immunisation_notes,
            'has_special_needs' => (bool) $this->has_special_needs,
            'special_needs_notes' => $this->special_needs_notes,
            'dietary_restrictions' => $this->dietary_restrictions,
            'doctor_name' => $this->doctor_name,
            'doctor_phone' => $this->doctor_phone,
            'medical_consent' => (bool) $this->medical_consent,
            'medical_consent_at' => $this->medical_consent_at?->format('Y-m-d'),
            'alerts' => $this->alerts(),
        ];
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
