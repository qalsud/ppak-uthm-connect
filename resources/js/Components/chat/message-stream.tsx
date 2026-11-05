import { router } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';

/**
 * Subscribes to the open conversation's private channel and triggers a partial
 * reload when someone else posts.
 */
export default function MessageStream({
    conversationId,
    currentUserId,
}: {
    conversationId: number;
    currentUserId: number;
}) {
    useEcho(
        `conversation.${conversationId}`,
        '.message.sent',
        (payload) => {
            if (payload.message.sender_id === currentUserId) {
                return;
            }

            // Background tab? Let the notification bell surface it instead of
            // silently marking the message read.
            if (document.visibilityState !== 'visible') {
                return;
            }

            router.reload({ only: ['open', 'conversations'] });
        },
        [conversationId, currentUserId],
    );

    return null;
}
