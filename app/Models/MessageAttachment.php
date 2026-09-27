<?php

namespace App\Models;

use App\Models\Concerns\HasStoredImage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MessageAttachment extends Model
{
    use HasStoredImage;

    protected $fillable = [
        'message_id',
        'student_id',
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
        return 'message.photos.show';
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
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
