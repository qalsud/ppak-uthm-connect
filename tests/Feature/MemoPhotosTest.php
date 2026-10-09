<?php

use App\Enums\UserRole;
use App\Models\Memo;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Notification::fake();
    Storage::fake('attendance');
    config()->set('media.disk', 'attendance');
});

function createMemo($case, User $admin, array $attachments = [], array $overrides = []): Memo
{
    $case->actingAs($admin)->post(route('admin.memos.store'), [
        'title' => 'Sports day',
        'description' => 'Bring a water bottle.',
        'audience' => 'all',
        'attachments' => $attachments,
        ...$overrides,
    ])->assertRedirect();

    return Memo::query()->latest('id')->firstOrFail();
}

test('an admin can create a memo with a photo', function () {
    $admin = User::factory()->role(UserRole::Admin)->create();

    $memo = createMemo($this, $admin, [UploadedFile::fake()->image('poster.jpg')]);

    expect($memo->attachments)->toHaveCount(1)
        ->and($memo->photos)->toHaveCount(1)
        ->and($memo->photos[0]['url'])->toContain('/memo-attachments/');

    Storage::disk('attendance')->assertExists($memo->attachments->first()->path);
});

test('a memo photo is served only to roles that can see the memo', function () {
    $admin = User::factory()->role(UserRole::Admin)->create();
    $parent = User::factory()->role(UserRole::Parent)->create();
    $teacher = User::factory()->role(UserRole::Teacher)->create(['class' => null]);

    $memo = createMemo($this, $admin, [UploadedFile::fake()->image('a.jpg')], [
        'audience' => 'parents',
    ]);
    $photo = $memo->attachments->first();

    $this->actingAs($admin)->get(route('memo.photos.show', $photo))->assertOk();
    $this->actingAs($parent)->get(route('memo.photos.show', $photo))->assertOk();
    // A teacher does not see a parents-only memo, so neither does its photo.
    $this->actingAs($teacher)->get(route('memo.photos.show', $photo))->assertForbidden();
});

test('an admin can remove a memo photo when editing', function () {
    $admin = User::factory()->role(UserRole::Admin)->create();

    $memo = createMemo($this, $admin, [
        UploadedFile::fake()->image('a.jpg'),
        UploadedFile::fake()->image('b.jpg'),
    ]);

    expect($memo->attachments)->toHaveCount(2);

    $removed = $memo->attachments->first();

    $this->actingAs($admin)->put(route('admin.memos.update', $memo), [
        'title' => $memo->title,
        'description' => $memo->description,
        'audience' => 'all',
        'remove_attachments' => [$removed->id],
    ])->assertRedirect();

    expect($memo->fresh()->attachments)->toHaveCount(1);

    Storage::disk('attendance')->assertMissing($removed->path);
});

test('a memo photo can be added when editing', function () {
    $admin = User::factory()->role(UserRole::Admin)->create();
    $memo = createMemo($this, $admin);

    expect($memo->attachments)->toHaveCount(0);

    $this->actingAs($admin)->put(route('admin.memos.update', $memo), [
        'title' => $memo->title,
        'description' => $memo->description,
        'audience' => 'all',
        'attachments' => [UploadedFile::fake()->image('later.jpg')],
    ])->assertRedirect();

    expect($memo->fresh()->attachments)->toHaveCount(1);
});

test('a memo rejects non-images and too many photos', function () {
    $admin = User::factory()->role(UserRole::Admin)->create();

    $this->actingAs($admin)->post(route('admin.memos.store'), [
        'title' => 'T',
        'description' => 'D',
        'audience' => 'all',
        'attachments' => [UploadedFile::fake()->create('notes.pdf', 100, 'application/pdf')],
    ])->assertSessionHasErrors('attachments.0');

    $this->actingAs($admin)->post(route('admin.memos.store'), [
        'title' => 'T',
        'description' => 'D',
        'audience' => 'all',
        'attachments' => collect(range(1, 4))
            ->map(fn (int $i) => UploadedFile::fake()->image("p{$i}.jpg"))
            ->all(),
    ])->assertSessionHasErrors('attachments');
});
