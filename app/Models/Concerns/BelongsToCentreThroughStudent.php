<?php

namespace App\Models\Concerns;

use App\Support\ActiveCentre;
use Illuminate\Database\Eloquent\Builder;

/**
 * Records that belong to a centre through their `student` relation (payments,
 * fee records). Admin lists hide other centres while one is active.
 */
trait BelongsToCentreThroughStudent
{
    public function scopeForActiveCentre(Builder $query): Builder
    {
        $centreId = ActiveCentre::id();

        return $query->when(
            $centreId,
            fn (Builder $q) => $q->whereHas('student', fn (Builder $s) => $s->where('centre_id', $centreId)),
        );
    }
}
