<?php

namespace App\Http\Controllers;

use App\Models\AbsenceAttachment;
use App\Models\AttendancePhoto;
use App\Models\AuthorisedCollector;
use App\Models\Memo;
use App\Models\MemoAttachment;
use App\Models\MessageAttachment;
use App\Models\ProgressPhoto;
use App\Models\Student;
use App\Models\User;
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

    /** A memo photo: visible to anyone who can see the memo itself. */
    public function memo(Request $request, MemoAttachment $photo): StreamedResponse
    {
        $user = $request->user();

        $allowed = $user !== null
            && Memo::query()->visibleTo($user)->whereKey($photo->memo_id)->exists();

        abort_unless($allowed, 403);

        return $this->streamStored($photo);
    }

    /** Authorised collector's photo (staff only — used for verification). */
    public function collector(Request $request, AuthorisedCollector $collector): StreamedResponse
    {
        abort_unless($this->canViewStudent($request->user(), $collector->student), 403);

        $response = $collector->photoResponse();

        abort_if($response === null, 404);

        return $response;
    }

    /** Child profile photo (admin/teacher, or the child's own parent). */
    public function student(Request $request, Student $student): StreamedResponse
    {
        abort_unless($this->canViewStudent($request->user(), $student), 403);
        abort_unless($student->photo_path, 404);

        $disk = Storage::disk($student->photo_disk ?? config('media.disk'));

        abort_unless($disk->exists($student->photo_path), 404);

        return $disk->response($student->photo_path, null, [
            'Content-Type' => 'image/jpeg',
            'Cache-Control' => 'private, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /** Absence proof documents: images render inline, PDFs download. */
    public function absence(Request $request, AbsenceAttachment $attachment): StreamedResponse
    {
        abort_unless($this->canViewStudent($request->user(), $attachment->student), 403);

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
        abort_unless($this->canViewStudent($request->user(), $photo->student), 403);

        return $this->streamStored($photo);
    }

    /**
     * The single rule for child media: admins see everything, a parent sees
     * their own child, and a teacher is limited to the centre + class they can
     * manage. Using `canManage()` keeps photos consistent with the write routes.
     */
    private function canViewStudent(?User $user, ?Student $student): bool
    {
        if (! $user || ! $student) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        if ($user->isParent()) {
            return $student->parent_id === $user->id;
        }

        return $user->isTeacher() && $user->canManage($student);
    }

    /** Stream a stored image (or its thumbnail) from the private disk. */
    private function streamStored(AttendancePhoto|ProgressPhoto|MessageAttachment|MemoAttachment $photo): StreamedResponse
    {
        $path = request()->query('variant') === 'thumb' && $photo->thumb_path
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
