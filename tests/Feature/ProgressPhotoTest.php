<?php

use App\Enums\UserRole;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\ProgressPhoto;
use App\Models\ProgressRecord;
use App\Models\Student;
use App\Models\User;
use App\Notifications\ProgressRecordedNotification;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

function progressSetup(): array
{
    $parent = User::factory()->role(UserRole::Parent)->create();
    $teacher = User::factory()->role(UserRole::Teacher)->create();
    $student = Student::factory()->create(['parent_id' => $parent->id, 'class' => '5tahun']);

    return [$parent, $teacher, $student];
}

function progressPayload(array $overrides = []): array
{
    return array_merge([
        'date' => today()->toDateString(),
        'sub_theme' => 'Myself',
        'activity_done' => 'Good',
        'child_proficiency' => 'Average',
        'permata_activity' => 'Drawing',
        'free_activity' => 'Playing',
        'development_proficiency' => 'Social Skills',
        'notes' => 'Enjoyed the activity.',
    ], $overrides);
}

beforeEach(function () {
    Storage::fake('attendance');
    config()->set('media.disk', 'attendance');
});

test('a teacher can record progress with a photo that reaches the parent chat', function () {
    Notification::fake();
    [$parent, $teacher, $student] = progressSetup();

    $this->actingAs($teacher)
        ->post(route('teacher.progress.store'), progressPayload([
            'student_id' => $student->id,
            'photo' => UploadedFile::fake()->image('work.jpg', 1200, 900),
        ]))
        ->assertRedirect()
        ->assertSessionHas('success');

    $record = ProgressRecord::where('student_id', $student->id)->first();
    expect($record)->not->toBeNull();

    $photo = ProgressPhoto::sole();
    expect($photo->progress_record_id)->toBe($record->id)
        ->and($photo->student_id)->toBe($student->id)
        ->and($photo->uploaded_by)->toBe($teacher->id);

    Storage::disk('attendance')->assertExists($photo->path);
    Storage::disk('attendance')->assertExists($photo->thumb_path);

    $conversation = Conversation::where('student_id', $student->id)->first();
    expect(Message::where('conversation_id', $conversation->id)->where('progress_photo_id', $photo->id)->exists())
        ->toBeTrue();

    Notification::assertSentTo($parent, ProgressRecordedNotification::class);
});

test('progress can still be recorded without a photo', function () {
    [, $teacher, $student] = progressSetup();

    $this->actingAs($teacher)
        ->post(route('teacher.progress.store'), progressPayload(['student_id' => $student->id]))
        ->assertSessionHas('success');

    expect(ProgressRecord::where('student_id', $student->id)->exists())->toBeTrue();
    expect(ProgressPhoto::count())->toBe(0);
    expect(Message::count())->toBe(0);
});

test('re-uploading a progress photo replaces the previous one', function () {
    [, $teacher, $student] = progressSetup();

    $post = fn (string $name) => $this->actingAs($teacher)->post(route('teacher.progress.store'), progressPayload([
        'student_id' => $student->id,
        'photo' => UploadedFile::fake()->image($name),
    ]));

    $post('first.jpg');
    $first = ProgressPhoto::sole();

    $post('second.jpg');

    expect(ProgressPhoto::count())->toBe(1);
    Storage::disk('attendance')->assertMissing($first->path);
});

test('progress photos are only visible to staff and the child\'s parent', function () {
    [, $teacher, $student] = progressSetup();
    $parent = $student->parent;
    $otherParent = User::factory()->role(UserRole::Parent)->create();

    $this->actingAs($teacher)->post(route('teacher.progress.store'), progressPayload([
        'student_id' => $student->id,
        'photo' => UploadedFile::fake()->image('work.jpg'),
    ]));

    $photo = ProgressPhoto::sole();

    $this->actingAs($teacher)->get(route('progress.photos.show', $photo))->assertOk();
    $this->actingAs($parent)->get(route('progress.photos.show', $photo))->assertOk();
    $this->actingAs($otherParent)->get(route('progress.photos.show', $photo))->assertForbidden();
});

test('the prune command also removes old progress photos', function () {
    [, $teacher, $student] = progressSetup();

    $this->actingAs($teacher)->post(route('teacher.progress.store'), progressPayload([
        'student_id' => $student->id,
        'photo' => UploadedFile::fake()->image('work.jpg'),
    ]));

    $photo = ProgressPhoto::sole();
    $photo->forceFill(['created_at' => now()->subDays(5)])->save();

    $this->artisan('media:prune-photos')->assertSuccessful();

    expect(ProgressPhoto::count())->toBe(0);
    Storage::disk('attendance')->assertMissing($photo->path);

    // The progress record itself survives.
    expect(ProgressRecord::where('student_id', $student->id)->exists())->toBeTrue();
});
