<?php

use App\Enums\UserRole;
use App\Events\MessageSent;
use App\Models\Conversation;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\Event;

function realtimeChatSetup(): array
{
    $parent = User::factory()->role(UserRole::Parent)->create();
    $teacher = User::factory()->role(UserRole::Teacher)->create(['class' => '5tahun']);
    $student = Student::factory()->create(['parent_id' => $parent->id, 'class' => '5tahun']);
    $conversation = Conversation::create(['student_id' => $student->id]);

    return [$parent, $teacher, $student, $conversation];
}

/**
 * The test env broadcasts over the null driver, which skips channel checks.
 * Point it at the (Pusher-compatible) Reverb connection so authorization runs.
 */
function broadcastingAsReverb(): void
{
    config([
        'broadcasting.default' => 'reverb',
        'broadcasting.connections.reverb.key' => 'test-key',
        'broadcasting.connections.reverb.secret' => 'test-secret',
        'broadcasting.connections.reverb.app_id' => 'test-app',
    ]);

    // Channels register against whichever driver is default when the routes
    // file loads (the null driver at boot). Re-run it now the default is the
    // Reverb connection, so authorization is actually enforced.
    require base_path('routes/channels.php');
}

test('posting a message broadcasts MessageSent to the thread and its recipients', function () {
    Event::fake([MessageSent::class]);
    [$parent, $teacher, , $conversation] = realtimeChatSetup();

    $this->actingAs($parent)->post(route('parent.messages.store', $conversation), ['body' => 'Hello']);

    Event::assertDispatched(MessageSent::class, function (MessageSent $event) use ($conversation, $teacher) {
        $channels = collect($event->broadcastOn())->map(fn ($channel) => $channel->name);

        return $event->message->conversation_id === $conversation->id
            && $channels->contains('private-conversation.'.$conversation->id)
            && $channels->contains('private-App.Models.User.'.$teacher->id);
    });
});

test('conversation channel authorization allows participants and blocks outsiders', function () {
    broadcastingAsReverb();
    [$parent, $teacher, , $conversation] = realtimeChatSetup();
    $outsider = User::factory()->role(UserRole::Teacher)->create(['class' => '6bintang']);
    $admin = User::factory()->role(UserRole::Admin)->create();

    $payload = ['channel_name' => 'private-conversation.'.$conversation->id, 'socket_id' => '1234.5678'];

    $this->actingAs($parent)->postJson('/broadcasting/auth', $payload)->assertOk();
    $this->actingAs($teacher)->postJson('/broadcasting/auth', $payload)->assertOk();
    $this->actingAs($admin)->postJson('/broadcasting/auth', $payload)->assertOk();
    $this->actingAs($outsider)->postJson('/broadcasting/auth', $payload)->assertForbidden();
});

test('user channel authorization only allows the owner', function () {
    broadcastingAsReverb();
    [$parent] = realtimeChatSetup();
    $other = User::factory()->role(UserRole::Teacher)->create(['class' => '6bintang']);

    $payload = ['channel_name' => 'private-App.Models.User.'.$parent->id, 'socket_id' => '1234.5678'];

    $this->actingAs($parent)->postJson('/broadcasting/auth', $payload)->assertOk();
    $this->actingAs($other)->postJson('/broadcasting/auth', $payload)->assertForbidden();
});
