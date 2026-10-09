/**
 * Typed Laravel Echo payloads for events broadcast by the app.
 *
 * @see app/Events/MessageSent.php
 */
declare global {
    interface Events {
        // Leading dot = Echo binds the name verbatim (skips its App.Events
        // namespace and dot→backslash rewriting), matching `broadcastAs()`.
        '.message.sent': {
            conversation_id: number;
            message: {
                id: number;
                conversation_id: number;
                sender_id: number;
                body: string;
                type: 'user' | 'system';
                is_system?: boolean;
                is_deleted?: boolean;
                sent_time?: string | null;
                sent_date?: string | null;
            };
        };
    }
}

export {};
