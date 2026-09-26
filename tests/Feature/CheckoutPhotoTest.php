<?php

use App\Enums\UserRole;
use App\Models\Attendance;
use App\Models\AttendancePhoto;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Student;
use App\Models\User;
use App\Notifications\CheckoutRecordedNotification;
use App\Services\Images\ImageStore;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

function checkoutSetup(): array
{
    $parent = User::factory()->role(UserRole::Parent)->create();
    $teacher = User::factory()->role(UserRole::Teacher)->create();
    $student = Student::factory()->create(['parent_id' => $parent->id]);

    return [$parent, $teacher, $student];
}

beforeEach(function () {
    Storage::fake('attendance');
    config()->set('media.disk', 'attendance');
});

test('a teacher cannot check out without a photo', function () {
    [, $teacher, $student] = checkoutSetup();

    $this->actingAs($teacher)
        ->post(route('teacher.attendance.checkout', $student), [])
        ->assertSessionHasErrors('photo');

    expect(AttendancePhoto::count())->toBe(0);
    expect(Attendance::where('student_id', $student->id)->first()?->departed_at)->toBeNull();
});

test('a teacher checks out with a photo, notifies the parent and posts to chat', function () {
    Notification::fake();
    [$parent, $teacher, $student] = checkoutSetup();

    $this->actingAs($teacher)
        ->post(route('teacher.attendance.checkout', $student), [
            'photo' => UploadedFile::fake()->image('child.jpg', 900, 700),
            'note' => 'Collected by grandmother',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $attendance = Attendance::where('student_id', $student->id)->first();
    expect($attendance)->not->toBeNull()
        ->and($attendance->status())->toBe('home')
        ->and($attendance->checkout_note)->toBe('Collected by grandmother')
        ->and($attendance->checkout_photo_override)->toBeFalse();

    $photo = AttendancePhoto::sole();
    expect($photo->type)->toBe('checkout')
        ->and($photo->student_id)->toBe($student->id)
        ->and($photo->uploaded_by)->toBe($teacher->id);

    Storage::disk('attendance')->assertExists($photo->path);
    Storage::disk('attendance')->assertExists($photo->thumb_path);

    // Stored image is a JPEG, capped to the max dimension and target size.
    $storedPath = Storage::disk('attendance')->path($photo->path);
    $info = getimagesize($storedPath);
    expect($info['mime'])->toBe('image/jpeg')
        ->and(max($photo->width, $photo->height))->toBeLessThanOrEqual((int) config('media.max_dimension'))
        ->and($photo->size)->toBeLessThanOrEqual((int) config('media.target_kb') * 1024);

    // The photo is attached to a chat message for the parent.
    $conversation = Conversation::where('student_id', $student->id)->first();
    expect($conversation)->not->toBeNull();
    expect(Message::where('conversation_id', $conversation->id)->where('attendance_photo_id', $photo->id)->exists())
        ->toBeTrue();

    Notification::assertSentTo($parent, CheckoutRecordedNotification::class);
});

test('a documented override allows checkout without a photo but needs a reason', function () {
    [, $teacher, $student] = checkoutSetup();

    // Missing reason → rejected.
    $this->actingAs($teacher)
        ->post(route('teacher.attendance.checkout', $student), ['skip_photo' => true])
        ->assertSessionHasErrors('override_reason');

    // With reason → allowed and recorded.
    $this->actingAs($teacher)
        ->post(route('teacher.attendance.checkout', $student), [
            'skip_photo' => true,
            'override_reason' => 'Camera not working',
        ])
        ->assertSessionHas('success');

    $attendance = Attendance::where('student_id', $student->id)->first();
    expect($attendance->status())->toBe('home')
        ->and($attendance->checkout_photo_override)->toBeTrue()
        ->and($attendance->checkout_override_reason)->toBe('Camera not working');

    expect(AttendancePhoto::count())->toBe(0);
});

test('the image pipeline compresses toward the target size', function () {
    config()->set('media.target_kb', 40);

    // High-entropy noise compresses poorly, so this exercises the shrink loop.
    $img = imagecreatetruecolor(1200, 900);
    for ($x = 0; $x < 1200; $x += 2) {
        for ($y = 0; $y < 900; $y += 2) {
            $c = imagecolorallocate($img, random_int(0, 255), random_int(0, 255), random_int(0, 255));
            imagefilledrectangle($img, $x, $y, $x + 1, $y + 1, $c);
        }
    }
    $tmp = sys_get_temp_dir().'/noise-'.uniqid().'.jpg';
    imagejpeg($img, $tmp, 95);
    imagedestroy($img);

    $stored = app(ImageStore::class)->store(
        new UploadedFile($tmp, 'noise.jpg', 'image/jpeg', null, true),
        'checkout',
        ['watermark' => ['PPAK UTHM', 'Test Child', '01/01/2026 10:00']],
    );

    expect($stored->size)->toBeLessThanOrEqual(40 * 1024);
});

test('a non-image upload is rejected', function () {
    [, $teacher, $student] = checkoutSetup();

    $this->actingAs($teacher)
        ->post(route('teacher.attendance.checkout', $student), [
            'photo' => UploadedFile::fake()->create('notes.pdf', 100, 'application/pdf'),
        ])
        ->assertSessionHasErrors('photo');

    expect(AttendancePhoto::count())->toBe(0);
});

test('parents cannot check a child out', function () {
    [$parent, , $student] = checkoutSetup();

    $this->actingAs($parent)
        ->post(route('teacher.attendance.checkout', $student), [
            'photo' => UploadedFile::fake()->image('child.jpg'),
        ])
        ->assertForbidden();

    expect(AttendancePhoto::count())->toBe(0);
});

test('teacher attendance endpoint only accepts arrivals', function () {
    [, $teacher, $student] = checkoutSetup();

    $this->actingAs($teacher)
        ->post(route('teacher.attendance.store', $student), ['action' => 'depart'])
        ->assertSessionHasErrors('action');

    $this->actingAs($teacher)
        ->post(route('teacher.attendance.store', $student), ['action' => 'arrive'])
        ->assertSessionHas('success');

    expect(Attendance::where('student_id', $student->id)->first()->status())->toBe('school');
});

test('attendance photos are only visible to staff and the child\'s parent', function () {
    [, $teacher, $student] = checkoutSetup();
    $parent = $student->parent;
    $otherParent = User::factory()->role(UserRole::Parent)->create();
    $admin = User::factory()->role(UserRole::Admin)->create();

    $this->actingAs($teacher)
        ->post(route('teacher.attendance.checkout', $student), [
            'photo' => UploadedFile::fake()->image('child.jpg'),
        ]);

    $photo = AttendancePhoto::sole();

    $this->actingAs($teacher)->get(route('attendance.photos.show', $photo))->assertOk();
    $this->actingAs($admin)->get(route('attendance.photos.show', $photo))->assertOk();
    $this->actingAs($parent)->get(route('attendance.photos.show', $photo))->assertOk();
    $this->actingAs($otherParent)->get(route('attendance.photos.show', $photo))->assertForbidden();

    auth()->logout();
    $this->get(route('attendance.photos.show', $photo))->assertRedirect(route('login'));
});

test('re-marking arrival reopens a day that was checked out', function () {
    [, $teacher, $student] = checkoutSetup();

    $this->actingAs($teacher)->post(route('teacher.attendance.checkout', $student), [
        'photo' => UploadedFile::fake()->image('child.jpg'),
    ]);

    expect(Attendance::where('student_id', $student->id)->first()->status())->toBe('home');

    $this->actingAs($teacher)->post(route('teacher.attendance.store', $student), ['action' => 'arrive']);

    expect(Attendance::where('student_id', $student->id)->first()->status())->toBe('school');
});

test('the prune command deletes old photos and clears the chat attachment', function () {
    [, $teacher, $student] = checkoutSetup();

    $this->actingAs($teacher)
        ->post(route('teacher.attendance.checkout', $student), [
            'photo' => UploadedFile::fake()->image('child.jpg'),
        ]);

    $photo = AttendancePhoto::sole();
    $photo->forceFill(['created_at' => now()->subDays(5)])->save();

    $this->artisan('attendance:prune-photos')->assertSuccessful();

    expect(AttendancePhoto::count())->toBe(0);
    Storage::disk('attendance')->assertMissing($photo->path);
    expect(Message::where('attendance_photo_id', $photo->id)->exists())->toBeFalse();

    // The checkout event itself and its message text survive.
    expect(Attendance::where('student_id', $student->id)->first()->status())->toBe('home');
    expect(Message::count())->toBe(1);
});
