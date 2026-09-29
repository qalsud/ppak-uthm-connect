<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Guardian extends Model
{
    /** mother | father | guardian | other */
    public const RELATIONSHIPS = ['mother', 'father', 'guardian', 'other'];

    protected $fillable = [
        'student_id',
        'user_id',
        'name',
        'relationship',
        'ic_number',
        'phone',
        'email',
        'occupation',
        'is_primary',
        'can_collect',
        'notes',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'can_collect' => 'boolean',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function summary(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'relationship' => $this->relationship,
            'ic_number' => $this->ic_number,
            'phone' => $this->phone,
            'email' => $this->email,
            'occupation' => $this->occupation,
            'is_primary' => (bool) $this->is_primary,
            'can_collect' => (bool) $this->can_collect,
            'notes' => $this->notes,
            'has_account' => $this->user_id !== null,
        ];
    }
}
