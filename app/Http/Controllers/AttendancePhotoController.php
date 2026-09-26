<?php

namespace App\Http\Controllers;

use App\Models\AttendancePhoto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Serves attendance photos from the private disk to authorised users only.
 */
class AttendancePhotoController extends Controller
{
    public function show(Request $request, AttendancePhoto $attendancePhoto): StreamedResponse
    {
        $user = $request->user();

        $ownsChild = $attendancePhoto->student?->parent_id === $user?->id;
        $allowed = $user !== null && ($user->isAdmin() || $user->isTeacher() || $ownsChild);

        abort_unless($allowed, 403);

        $path = $request->query('variant') === 'thumb' && $attendancePhoto->thumb_path
            ? $attendancePhoto->thumb_path
            : $attendancePhoto->path;

        $disk = Storage::disk($attendancePhoto->disk);

        abort_unless($disk->exists($path), 404);

        return $disk->response($path, null, [
            'Content-Type' => 'image/jpeg',
            'Cache-Control' => 'private, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
