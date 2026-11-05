import type { PhotoInfo } from '@/lib/photo';

export type ChatConversation = {
    id: number;
    student: string;
    class?: string | null;
    parent?: string | null;
    teacher?: string | null;
    last_message: string | null;
    last_type?: 'user' | 'system' | null;
    last_time?: string | null;
    last_date?: string | null;
    unread: number;
};

export type ChatMessage = {
    id: number;
    sender_id: number;
    sender: { name: string } | null;
    body: string;
    type: 'user' | 'system';
    is_system?: boolean;
    is_deleted?: boolean;
    photo_url?: string | null;
    photo_expired?: boolean;
    attachments?: PhotoInfo[];
    sent_time: string | null;
    sent_date: string | null;
    read_at?: string | null;
    edited_at?: string | null;
};

export type ChatOpen = {
    id: number;
    student: { id: number; name: string; class: string };
    teacher: { id: number; name: string } | null;
    messages: ChatMessage[];
    has_more: boolean;
    oldest_id: number | null;
    closed?: boolean;
};
