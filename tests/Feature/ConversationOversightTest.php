<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Centre;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\CentreSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function conversationAdmin(): User
{
    return User::factory()->role(UserRole::Admin)->create();
}

test('an admin can send into a parent thread', function () {
    $admin = conversationAdmin();
    $child = Student::factory()->create();
    $conversation = Conversation::create(['student_id' => $child->id]);

    $this->actingAs($admin)
        ->post(route('admin.conversations.send', $conversation), ['body' => 'Office follow-up'])
        ->assertRedirect()->assertSessionHasNoErrors();

    $message = Message::firstOrFail();

    expect($message->body)->toBe('Office follow-up')
        ->and($message->sender_id)->toBe($admin->id)
        ->and($message->type)->toBe(Message::TYPE_USER);
});

test('an admin can reassign the thread only to a centre-appropriate teacher', function () {
    $this->seed(CentreSeeder::class);
    $khalifah = Centre::where('code', 'khalifah-junior')->firstOrFail();
    $taska = Centre::where('code', 'taska-hikmah')->firstOrFail();

    $admin = conversationAdmin();
    $child = Student::factory()->create(['centre_id' => $khalifah->id]);
    $conversation = Conversation::create(['student_id' => $child->id]);

    $mine = User::factory()->role(UserRole::Teacher)->create();
    $mine->centres()->attach($khalifah->id);

    $other = User::factory()->role(UserRole::Teacher)->create();
    $other->centres()->attach($taska->id);

    $this->actingAs($admin)
        ->patch(route('admin.conversations.reassign', $conversation), ['teacher_id' => $mine->id])
        ->assertRedirect()->assertSessionHasNoErrors();

    expect($conversation->fresh()->teacher_id)->toBe($mine->id);

    $this->actingAs($admin)
        ->patch(route('admin.conversations.reassign', $conversation), ['teacher_id' => $other->id])
        ->assertSessionHasErrors('teacher_id');
});

test('closing a thread blocks replies until it is reopened', function () {
    $admin = conversationAdmin();
    $child = Student::factory()->create();
    $conversation = Conversation::create(['student_id' => $child->id]);

    $this->actingAs($admin)->patch(route('admin.conversations.close', $conversation))->assertRedirect();
    expect($conversation->fresh()->closed_at)->not->toBeNull();

    $this->actingAs($admin)
        ->post(route('admin.conversations.send', $conversation), ['body' => 'nope'])
        ->assertSessionHas('error', __('conversation_closed'));

    expect(Message::count())->toBe(0);

    $this->actingAs($admin)->patch(route('admin.conversations.reopen', $conversation))->assertRedirect();
    expect($conversation->fresh()->closed_at)->toBeNull();

    $this->actingAs($admin)
        ->post(route('admin.conversations.send', $conversation), ['body' => 'welcome back'])
        ->assertSessionHasNoErrors();

    expect(Message::count())->toBe(1);
});

test('a non-admin cannot use the admin conversation actions', function () {
    $teacher = User::factory()->role(UserRole::Teacher)->create();
    $child = Student::factory()->create();
    $conversation = Conversation::create(['student_id' => $child->id]);

    $this->actingAs($teacher)->get(route('admin.conversations.index'))->assertForbidden();
    $this->actingAs($teacher)->post(route('admin.conversations.send', $conversation), ['body' => 'x'])->assertForbidden();
    $this->actingAs($teacher)->patch(route('admin.conversations.close', $conversation))->assertForbidden();
});
