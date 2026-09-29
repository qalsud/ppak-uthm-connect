<?php

namespace App\Http\Controllers;

use App\Models\AbsenceAttachment;
use App\Models\AttendancePhoto;
use App\Models\MessageAttachment;
use App\Models\ProgressPhoto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Serves stored photos from the private disk to authorised users only.
 */
class PhotoController extends Controller
{
    public function attendance(Request $request, AttendancePhoto $photo): StreamedResponse
    {
        return $this->serve($request, $photo);
    }

    public function progress(Request $request, ProgressPhoto $photo): StreamedResponse
    {
        return $this->serve($request, $photo);
    }

    public function message(Request $request, MessageAttachment $photo): StreamedResponse
    {
        return $this->serve($request, $photo);
    }

    /** Absence proof documents: images render inline, PDFs download. */
    public function absence(Request $request, AbsenceAttachment $attachment): StreamedResponse
    {
        $user = $request->user();

        $ownsChild = $attachment->student?->parent_id === $user?->id;
        $allowed = $user !== null && ($user->isAdmin() || $user->isTeacher() || $ownsChild);

        abort_unless($allowed, 403);

        $path = $request->query('variant') === 'thumb' && $attachment->thumb_path
            ? $attachment->thumb_path
            : $attachment->path;

        $disk = Storage::disk($attachment->disk);

        abort_unless($disk->exists($path), 404);

        return $disk->response($path, $attachment->original_name, [
            'Content-Type' => $attachment->mime,
            'Cache-Control' => 'private, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    private function serve(Request $request, AttendancePhoto|ProgressPhoto|MessageAttachment $photo): StreamedResponse
    {
        $user = $request->user();

        $ownsChild = $photo->student?->parent_id === $user?->id;
        $allowed = $user !== null && ($user->isAdmin() || $user->isTeacher() || $ownsChild);

        abort_unless($allowed, 403);

        $path = $request->query('variant') === 'thumb' && $photo->thumb_path
            ? $photo->thumb_path
            : $photo->path;

        $disk = Storage::disk($photo->disk);

        abort_unless($disk->exists($path), 404);

        return $disk->response($path, null, [
            'Content-Type' => 'image/jpeg',
            'Cache-Control' => 'private, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
