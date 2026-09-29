<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Media storage
    |--------------------------------------------------------------------------
    |
    | Images are stored on a PRIVATE disk and served through an authorised
    | route (see AttendancePhotoController) so they are never publicly
    | guessable from a URL.
    |
    */

    'disk' => env('MEDIA_DISK', 'attendance'),

    // Max accepted upload size, in kilobytes (validated server-side).
    'max_upload_kb' => (int) env('MEDIA_MAX_UPLOAD_KB', 10240),

    // Longest side after downscaling.
    'max_dimension' => (int) env('MEDIA_MAX_DIMENSION', 1600),

    // Longest side of the generated thumbnail.
    'thumb_dimension' => (int) env('MEDIA_THUMB_DIMENSION', 320),

    // JPEG quality for re-encoded images (EXIF is stripped in the process).
    'quality' => (int) env('MEDIA_QUALITY', 80),

    // Aim for at most this size (KB) per stored image; quality/dimensions are
    // reduced automatically until it fits. 0 disables compression targeting.
    'target_kb' => (int) env('MEDIA_TARGET_KB', 1024),

    // Overlay a proof-of-delivery style timestamp watermark on the image.
    'watermark_enabled' => (bool) env('MEDIA_WATERMARK', true),
    'watermark_font' => resource_path('fonts/DejaVuSans-Bold.ttf'),

    'allowed_mimes' => ['image/jpeg', 'image/png', 'image/webp'],

    /*
    |--------------------------------------------------------------------------
    | Attendance checkout photos
    |--------------------------------------------------------------------------
    */

    // Whether a photo is mandatory when a teacher checks a child out.
    'checkout_photo_required' => (bool) env('CHECKOUT_PHOTO_REQUIRED', true),
    'document_max_upload_kb' => (int) env('MEDIA_DOCUMENT_MAX_UPLOAD_KB', 5120),

    // Days to keep checkout photos before pruning (0 = keep forever).
    'retention_days' => (int) env('CHECKOUT_PHOTO_RETENTION_DAYS', 3),

];
