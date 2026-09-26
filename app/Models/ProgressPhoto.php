<?php

namespace App\Models;

use App\Models\Concerns\HasStoredImage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProgressPhoto extends Model
{
    use HasStoredImage;

    protected $fillable = [
        'progress_record_id',
        'student_id',
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
        return 'progress.photos.show';
    }

    public function progressRecord(): BelongsTo
    {
        return $this->belongsTo(ProgressRecord::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
