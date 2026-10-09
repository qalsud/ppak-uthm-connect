<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * A message was posted to a conversation.
 *
 * Broadcast immediately (not queued) so it works without a queue worker,
 * matching this app's synchronous notifications. It is delivered to:
 *  - `conversation.{id}` — anyone with the thread open, and
 *  - `App.Models.User.{id}` — each intended recipient, which drives the
 *    notification bell without a page refresh.
 */
class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

    /**
     * @param  array<int, int>  $recipientIds
     */
    public function __construct(
        public Message $message,
        public array $recipientIds = [],
    ) {}

    /**
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        $channels = [new PrivateChannel('conversation.'.$this->message->conversation_id)];

        foreach (array_unique($this->recipientIds) as $id) {
            $channels[] = new PrivateChannel('App.Models.User.'.$id);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'conversation_id' => $this->message->conversation_id,
            'message' => $this->message->loadMissing('sender:id,name')->toArray(),
        ];
    }
}
