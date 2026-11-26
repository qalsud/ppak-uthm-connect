<?php

namespace App\Models;

use App\Models\Concerns\HasStoredImage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProgressGroupPhoto extends Model
{
    use HasStoredImage;

    protected $fillable = [
        'group_activity_id',
        'disk',
        'path',
        'thumb_path',
        'original_name',
        'mime',
        'size',
        'width',
        'height',
        'note',
        'uploaded_by',
    ];

    protected $casts = [
        'size' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
    ];

    protected function imageRouteName(): string
    {
        return 'progress.group-photos.show';
    }

    public function groupActivity(): BelongsTo
    {
        return $this->belongsTo(ProgressGroupActivity::class, 'group_activity_id');
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
