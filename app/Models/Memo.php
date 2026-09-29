<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Memo extends Model
{
    use SoftDeletes;

    /** all | parents | teachers | class */
    public const AUDIENCES = ['all', 'parents', 'teachers', 'class'];

    protected $fillable = [
        'author_id',
        'title',
        'description',
        'audience',
        'class',
        'centre_id',
    ];

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function centre(): BelongsTo
    {
        return $this->belongsTo(Centre::class);
    }

    public function audienceLabel(): string
    {
        return match ($this->audience) {
            'parents' => 'Parents',
            'teachers' => 'Teachers',
            'class' => Student::classLabelStatic((string) $this->class),
            default => 'Everyone',
        };
    }
}
