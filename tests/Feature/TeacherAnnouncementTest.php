<?php

use App\Enums\UserRole;
use App\Models\Centre;
use App\Models\Memo;
use App\Models\Student;
use App\Models\User;
use App\Notifications\MemoPostedNotification;
use Illuminate\Support\Facades\Notification;

function announcementCast(): array
{
    $mine = Centre::create(['name' => 'Centre A', 'code' => 'centre-a']);
    $other = Centre::create(['name' => 'Centre B', 'code' => 'centre-b']);

    $teacher = User::factory()->role(UserRole::Teacher)->create(['class' => '5tahun']);
    $teacher->centres()->attach($mine->id);

    $parent = User::factory()->role(UserRole::Parent)->create();
    $child = Student::factory()->create([
        'parent_id' => $parent->id,
        'class' => '5tahun',
        'centre_id' => $mine->id,
    ]);

    return [$teacher, $parent, $child, $mine, $other];
}

test('a teacher can publish a memo to their own class and centre', function () {
    Notification::fake();

    [$teacher, $parent, $child, $centre] = announcementCast();

    $this->actingAs($teacher)
        ->post(route('teacher.memos.store'), [
            'title' => 'Bring a raincoat',
            'description' => 'We will play outside tomorrow.',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $memo = Memo::firstOrFail();

    expect($memo->author_id)->toBe($teacher->id)
        ->and($memo->audience)->toBe('class')
        ->and($memo->class)->toBe('5tahun')
        ->and($memo->centre_id)->toBe($centre->id);

    Notification::assertSentTo($parent, MemoPostedNotification::class);

    $this->actingAs($parent)
        ->get(route('parent.memos.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Parent/Memos')
            ->has('memos', 1)
            ->where('memos.0.title', 'Bring a raincoat'));
});

test('a teacher cannot send a memo to a centre outside their scope', function () {
    Notification::fake();

    [$teacher, , , , $other] = announcementCast();

    $this->actingAs($teacher)
        ->post(route('teacher.memos.store'), [
            'title' => 'Wrong centre',
            'description' => 'This should not be sent.',
            'centre_id' => $other->id,
        ])
        ->assertSessionHasErrors('centre_id');

    expect(Memo::count())->toBe(0);
});

test('a teacher without a class cannot publish a memo', function () {
    Notification::fake();

    $teacher = User::factory()->role(UserRole::Teacher)->create(['class' => null]);

    $this->actingAs($teacher)
        ->post(route('teacher.memos.store'), [
            'title' => 'No class',
            'description' => 'This should not be sent.',
        ])
        ->assertSessionHasErrors('title');

    expect(Memo::count())->toBe(0);
});
