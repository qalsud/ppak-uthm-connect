<?php

use App\Enums\AccountStatus;
use App\Enums\UserRole;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Student;
use App\Models\User;
use App\Notifications\MessageReceivedNotification;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

function chatSetup(): array
{
    $parent = User::factory()->role(UserRole::Parent)->create();
    $teacher = User::factory()->role(UserRole::Teacher)->create(['class' => null]);
    $student = Student::factory()->create(['parent_id' => $parent->id, 'class' => '5tahun']);
    $conversation = Conversation::create(['student_id' => $student->id]);

    return [$parent, $teacher, $student, $conversation];
}

beforeEach(function () {
    Storage::fake('attendance');
    config()->set('media.disk', 'attendance');
});

test('a parent can send a message with a photo attachment', function () {
    [$parent, , , $conversation] = chatSetup();

    $this->actingAs($parent)->post(route('parent.messages.store', $conversation), [
        'body' => 'Sakit hari ini',
        'attachments' => [UploadedFile::fake()->image('note.jpg')],
    ])->assertRedirect();

    $message = Message::query()->latest('id')->first();

    expect($message->body)->toBe('Sakit hari ini')
        ->and($message->attachments)->toHaveCount(1);
});

test('a sender can edit their own recent message', function () {
    [$parent, , , $conversation] = chatSetup();
    $message = $conversation->messages()->create(['sender_id' => $parent->id, 'body' => 'Typo']);

    $this->actingAs($parent)
        ->patch(route('messages.update', $message), ['body' => 'Fixed'])
        ->assertRedirect();

    expect($message->fresh()->body)->toBe('Fixed')
        ->and($message->fresh()->edited_at)->not->toBeNull();
});

test('a message cannot be edited by someone else', function () {
    [$parent, $teacher, , $conversation] = chatSetup();
    $message = $conversation->messages()->create(['sender_id' => $parent->id, 'body' => 'Mine']);

    $this->actingAs($teacher)
        ->patch(route('messages.update', $message), ['body' => 'Hacked'])
        ->assertForbidden();
});

test('deleting a message keeps a placeholder in the thread', function () {
    [$parent, , , $conversation] = chatSetup();
    $message = $conversation->messages()->create(['sender_id' => $parent->id, 'body' => 'Oops']);

    $this->actingAs($parent)->delete(route('messages.destroy', $message))->assertRedirect();

    expect(Message::withTrashed()->find($message->id)->trashed())->toBeTrue();

    $this->actingAs($parent)->get(route('parent.messages.show', $conversation))
        ->assertInertia(fn (Assert $page) => $page->where('open.messages.0.is_deleted', true));
});

test('the thread is paginated with a load-earlier cursor', function () {
    [$parent, , , $conversation] = chatSetup();

    for ($i = 1; $i <= 40; $i++) {
        $conversation->messages()->create(['sender_id' => $parent->id, 'body' => "m{$i}"]);
    }

    $this->actingAs($parent)->get(route('parent.messages.show', $conversation))
        ->assertInertia(fn (Assert $page) => $page
            ->has('open.messages', 30)
            ->where('open.has_more', true)
        );
});

test('an unassigned conversation notifies every active teacher of the class', function () {
    Notification::fake();
    [$parent, $assigned, , $conversation] = chatSetup();
    $assigned->update(['class' => '5tahun']);

    $sameClass = User::factory()->role(UserRole::Teacher)->create(['class' => '5tahun']);
    $otherClass = User::factory()->role(UserRole::Teacher)->create(['class' => '6bintang']);

    $this->actingAs($parent)->post(route('parent.messages.store', $conversation), ['body' => 'Hi']);

    Notification::assertSentTo($assigned, MessageReceivedNotification::class);
    Notification::assertSentTo($sameClass, MessageReceivedNotification::class);
    Notification::assertNotSentTo($otherClass, MessageReceivedNotification::class);
});

test('an inactive assignee falls back to the class teachers', function () {
    Notification::fake();
    [$parent, $assigned, , $conversation] = chatSetup();
    $conversation->update(['teacher_id' => $assigned->id]);
    $assigned->update(['status' => AccountStatus::Rejected, 'class' => '5tahun']);

    $fallback = User::factory()->role(UserRole::Teacher)->create(['class' => '5tahun']);

    $this->actingAs($parent)->post(route('parent.messages.store', $conversation), ['body' => 'Hello?']);

    Notification::assertNotSentTo($assigned, MessageReceivedNotification::class);
    Notification::assertSentTo($fallback, MessageReceivedNotification::class);
});

test('the updates endpoint returns only new messages', function () {
    [$parent, , , $conversation] = chatSetup();
    $first = $conversation->messages()->create(['sender_id' => $parent->id, 'body' => 'one']);
    $conversation->messages()->create(['sender_id' => $parent->id, 'body' => 'two']);

    $this->actingAs($parent)
        ->getJson(route('messages.updates', ['conversation' => $conversation, 'after' => $first->id]))
        ->assertOk()
        ->assertJsonCount(1, 'messages')
        ->assertJsonPath('messages.0.body', 'two');
});

test('admins can review conversations but teachers cannot', function () {
    [$parent, $teacher, , $conversation] = chatSetup();

    $admin = User::factory()->role(UserRole::Admin)->create();

    $this->actingAs($admin)->get(route('admin.conversations.index'))->assertOk();
    $this->actingAs($admin)->get(route('admin.conversations.show', $conversation))->assertOk();

    $this->actingAs($teacher)->get(route('admin.conversations.index'))->assertForbidden();
});

test('messages are only emailed to users who opted in', function () {
    [$parent, $teacher, , $conversation] = chatSetup();
    $notification = new MessageReceivedNotification($conversation, $parent, 'hi');

    expect($notification->via($teacher))->not->toContain('mail');

    $teacher->update(['notify_email_messages' => true]);

    expect($notification->via($teacher->fresh()))->toContain('mail');
});

test('a teacher cannot open another class conversation', function () {
    [$parent, $teacher, , $conversation] = chatSetup();
    $teacher->update(['class' => '6bintang']);

    $this->actingAs($teacher)
        ->get(route('teacher.messages.show', $conversation))
        ->assertForbidden();
});
