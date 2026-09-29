<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\AccountStatus;
use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Collection;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'ic_number',
        'phone',
        'password',
        'role',
        'class',
        'notify_email_messages',
        'status',
        'rejection_reason',
        'activation_token',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'activation_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'notify_email_messages' => 'boolean',
            'role' => UserRole::class,
            'status' => AccountStatus::class,
        ];
    }

    public function students()
    {
        return $this->hasMany(Student::class, 'parent_id');
    }

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    public function isTeacher(): bool
    {
        return $this->role === UserRole::Teacher;
    }

    public function isParent(): bool
    {
        return $this->role === UserRole::Parent;
    }

    public function isActive(): bool
    {
        return $this->status === AccountStatus::Active;
    }

    /** The class this teacher manages, or null when unrestricted. */
    public function assignedClass(): ?string
    {
        return $this->class ?: null;
    }

    /** Centres this user belongs to (staff may work at more than one). */
    public function centres(): BelongsToMany
    {
        return $this->belongsToMany(Centre::class, 'centre_user');
    }

    /**
     * Centre ids this user is scoped to. Null means unrestricted — which is
     * true for admins and for staff who have no centre assignment yet (they
     * predate centres, and an unassigned teacher was previously unrestricted).
     *
     * @return array<int, int>|null
     */
    public function centreIds(): ?array
    {
        if ($this->isAdmin()) {
            return null;
        }

        $ids = $this->centres()->pluck('centres.id')->all();

        return $ids === [] ? null : $ids;
    }

    /** Whether this user may see/act on the given centre. */
    public function belongsToCentre(?int $centreId): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        $ids = $this->centreIds();

        // Unrestricted (no centre assignment) or the record has no centre.
        if ($ids === null || $centreId === null) {
            return true;
        }

        return in_array($centreId, $ids, true);
    }

    /**
     * Whether this user may act on the given student's records.
     *
     * IMPORTANT: class alone is not a unique key — "5tahun" exists at both
     * centres. Access must match the centre as well as the class.
     */
    public function canManage(Student $student): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        if (! $this->isTeacher()) {
            return false;
        }

        // Centre must match (a teacher may belong to several).
        if (! $this->belongsToCentre($student->centre_id)) {
            return false;
        }

        // Within the right centre, a class assignment narrows it further.
        return $this->class === null || $this->class === $student->class;
    }

    /**
     * True when this user is acting with admin oversight — the frontend uses
     * this to render the admin shell around teacher screens.
     */
    public function actsAsAdmin(): bool
    {
        return $this->isAdmin();
    }

    /** Nav + shell a teacher screen should render for this user. */
    public function shell(): string
    {
        return $this->isAdmin() ? 'admin' : 'teacher';
    }

    /** Route name this user should be redirected to after login. */
    public function homeRoute(): string
    {
        return $this->role->homeRoute();
    }

    /**
     * Staff who should be notified about a given student: teachers at that
     * child's centre, plus any teacher with no centre assignment (who was
     * previously unrestricted). Never staff from another centre.
     *
     * @return Collection<int, User>
     */
    public static function staffForStudent(Student $student): Collection
    {
        return static::query()
            ->where('role', UserRole::Teacher)
            ->where('status', AccountStatus::Active)
            ->when($student->centre_id, fn ($q) => $q->where(fn ($w) => $w
                ->whereHas('centres', fn ($c) => $c->where('centres.id', $student->centre_id))
                ->orWhereDoesntHave('centres')
            ))
            ->get();
    }
}
