<?php

namespace App\Models;

use App\Support\ActiveCentre;
use App\Support\Lists;
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
        'centre_id',
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

    /**
     * Live, admin-editable versions of the constants above. Prefer these in
     * controllers/validation so an admin's edits take effect; the constants
     * remain as the shipped defaults for the seeder and migrations.
     */
    public static function classKeys(): array
    {
        return Lists::keys('class');
    }

    public static function statusKeys(): array
    {
        return Lists::keys('student_status');
    }

    public static function genderKeys(): array
    {
        return Lists::keys('gender');
    }

    public static function nationalityKeys(): array
    {
        return Lists::keys('nationality');
    }

    public static function immunisationKeys(): array
    {
        return Lists::keys('immunisation_status');
    }

    public static function bloodTypeKeys(): array
    {
        return Lists::keys('blood_type');
    }

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

    /**
     * Scope to what a given user may see. Admins see everything; a teacher sees
     * only their centre(s) and, if they have a class, only that class.
     *
     * This is the ONE place centre+class scoping lives, so no controller can
     * forget half of it.
     */
    public function scopeVisibleTo($query, ?User $user)
    {
        if (! $user || $user->isAdmin()) {
            return $query;
        }

        $centreIds = $user->centreIds();

        if ($centreIds !== null) {
            $query->whereIn('centre_id', $centreIds);
        }

        if ($user->isTeacher() && $user->class) {
            $query->where('class', $user->class);
        }

        if ($user->isParent()) {
            $query->where('parent_id', $user->id);
        }

        return $query;
    }

    /** Limit to a centre (no-op when null, i.e. "all centres"). */
    public function scopeInCentre($query, ?int $centreId)
    {
        return $centreId ? $query->where('centre_id', $centreId) : $query;
    }

    /**
     * Limit to the admin's currently-selected centre. A no-op for "All centres"
     * and for non-admins (who are already scoped by `visibleTo`).
     */
    public function scopeForActiveCentre($query, ?User $user = null)
    {
        $user ??= auth()->user();

        if (! $user?->isAdmin()) {
            return $query;
        }

        return $query->inCentre(ActiveCentre::id());
    }

    /** Limit to a class key within whatever centre scope is already applied. */
    public function scopeInClass($query, ?string $class)
    {
        return $class ? $query->where('class', $class) : $query;
    }

    /**
     * The class to open by default when none is chosen. Prefers the user's own
     * class, then the first class that actually has children *within scope* —
     * never a hardcoded '5tahun', which could belong to another centre.
     */
    public static function defaultClassFor(?User $user): ?string
    {
        if ($user?->isTeacher() && $user->class) {
            return $user->class;
        }

        return static::query()
            ->active()
            ->visibleTo($user)
            ->orderBy('class')
            ->value('class');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'parent_id');
    }

    public function centre(): BelongsTo
    {
        return $this->belongsTo(Centre::class);
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

    public function guardians(): HasMany
    {
        return $this->hasMany(Guardian::class)->orderByDesc('is_primary')->orderBy('name');
    }

    public function emergencyContacts(): HasMany
    {
        return $this->hasMany(EmergencyContact::class)->orderBy('priority')->orderBy('name');
    }

    public function authorisedCollectors(): HasMany
    {
        return $this->hasMany(AuthorisedCollector::class)->orderBy('name');
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

    /** Guardians, emergency contacts and authorised collectors, for the UI. */
    public function contacts(): array
    {
        return [
            'guardians' => $this->guardians->map(fn (Guardian $g) => $g->summary())->values()->all(),
            'emergency_contacts' => $this->emergencyContacts->map(fn (EmergencyContact $c) => $c->summary())->values()->all(),
            'collectors' => $this->authorisedCollectors->map(fn (AuthorisedCollector $c) => $c->summary())->values()->all(),
        ];
    }

    /**
     * Guardians who are allowed to collect this child, for the checkout
     * verification list.
     *
     * @return array<int, array<string, mixed>>
     */
    public function collectorOptions(): array
    {
        $guardians = $this->guardians
            ->where('can_collect', true)
            ->map(fn (Guardian $g) => [
                'id' => 'guardian-'.$g->id,
                'name' => $g->name,
                'relationship' => $g->relationship,
                'phone' => $g->phone,
                'photo_url' => null,
                'guardian' => true,
            ]);

        $collectors = $this->authorisedCollectors
            ->where('is_active', true)
            ->map(fn (AuthorisedCollector $c) => [
                'id' => 'collector-'.$c->id,
                'name' => $c->name,
                'relationship' => $c->relationship,
                'phone' => $c->phone,
                'photo_url' => $c->photoUrl(),
                'guardian' => false,
            ]);

        return $guardians->concat($collectors)->values()->all();
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
