<?php

namespace App\Models;

use App\Models\Concerns\HasStoredImage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A photo attached to a memo, stored on the private disk and served through
 * the authorised `memo.photos.show` route.
 */
class MemoAttachment extends Model
{
    use HasStoredImage;

    protected $fillable = [
        'memo_id',
        'disk',
        'path',
        'thumb_path',
        'original_name',
        'mime',
        'size',
        'width',
        'height',
        'uploaded_by',
    ];

    protected $casts = [
        'size' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
    ];

    protected function imageRouteName(): string
    {
        return 'memo.photos.show';
    }

    public function memo(): BelongsTo
    {
        return $this->belongsTo(Memo::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
