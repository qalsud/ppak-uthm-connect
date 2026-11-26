<?php

use App\Enums\UserRole;
use App\Models\Centre;
use App\Models\Memo;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;

function landingAdmin(): User
{
    return User::factory()->role(UserRole::Admin)->create();
}

function landingMemo(array $overrides = []): Memo
{
    return Memo::create([
        'title' => 'Public notice',
        'description' => 'Welcome to our centre.',
        'audience' => 'all',
        'is_public' => true,
        ...$overrides,
    ]);
}

test('the landing page only lists live public announcements', function () {
    $pinned = landingMemo([
        'title' => 'Pinned notice',
        'is_pinned' => true,
        'publish_at' => now()->subDays(3),
    ]);
    landingMemo([
        'title' => 'Latest notice',
        'publish_at' => now()->subDay(),
    ]);
    landingMemo([
        'title' => 'Internal memo',
        'is_public' => false,
    ]);
    landingMemo([
        'title' => 'Scheduled notice',
        'publish_at' => now()->addDay(),
    ]);
    landingMemo([
        'title' => 'Expired notice',
        'publish_at' => now()->subDays(5),
        'expires_at' => now()->subDay(),
    ]);

    $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('Welcome')
        ->has('announcements', 2)
        ->where('announcements.0.id', $pinned->id)
        ->where('announcements.0.title', 'Pinned notice')
        ->where('announcements.0.pinned', true)
        ->where('announcements.1.title', 'Latest notice'));
});

test('a public memo is normalised to the everyone audience and no class or centre', function () {
    Notification::fake();

    $centre = Centre::create(['name' => 'Test Centre', 'code' => 'test-centre']);

    $this->actingAs(landingAdmin())
        ->post(route('admin.memos.store'), [
            'title' => 'Open day',
            'description' => 'Everyone is welcome.',
            'audience' => 'class',
            'class' => '5tahun',
            'centre_id' => $centre->id,
            'is_public' => true,
            'is_pinned' => true,
            'notify_users' => false,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $memo = Memo::firstOrFail();

    expect($memo->is_public)->toBeTrue()
        ->and($memo->is_pinned)->toBeTrue()
        ->and($memo->notify_users)->toBeFalse()
        ->and($memo->audience)->toBe('all')
        ->and($memo->class)->toBeNull()
        ->and($memo->centre_id)->toBeNull()
        ->and($memo->publish_at)->not->toBeNull();
});

test('a public memo cannot carry photos', function () {
    Notification::fake();

    $this->actingAs(landingAdmin())
        ->post(route('admin.memos.store'), [
            'title' => 'Photo notice',
            'description' => 'This should not be public with a photo.',
            'is_public' => true,
            'attachments' => [UploadedFile::fake()->image('notice.jpg')],
        ])
        ->assertSessionHasErrors('is_public');

    expect(Memo::count())->toBe(0);
});

test('a public memo must expire after it is published', function () {
    Notification::fake();

    $this->actingAs(landingAdmin())
        ->post(route('admin.memos.store'), [
            'title' => 'Bad dates',
            'description' => 'Expiry is before publish time.',
            'is_public' => true,
            'publish_at' => now()->toDateTimeString(),
            'expires_at' => now()->subDay()->toDateTimeString(),
        ])
        ->assertSessionHasErrors('expires_at');

    expect(Memo::count())->toBe(0);
});

test('a teacher cannot publish a landing announcement', function () {
    Notification::fake();

    $teacher = User::factory()->role(UserRole::Teacher)->create(['class' => '5tahun']);

    $this->actingAs($teacher)
        ->post(route('teacher.memos.store'), [
            'title' => 'Not public',
            'description' => 'Class memo only.',
            'is_public' => true,
            'is_pinned' => true,
        ])
        ->assertRedirect();

    $memo = Memo::firstOrFail();

    expect($memo->is_public)->toBeFalse()
        ->and($memo->is_pinned)->toBeFalse()
        ->and($memo->audience)->toBe('class');
});

test('memos are not notified when notify users is off', function () {
    Notification::fake();

    $this->actingAs(landingAdmin())
        ->post(route('admin.memos.store'), [
            'title' => 'Silent notice',
            'description' => 'No bell notification.',
            'is_public' => true,
            'notify_users' => false,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    Notification::assertNothingSent();
});
