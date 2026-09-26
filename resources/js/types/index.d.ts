export interface User {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'teacher' | 'parent';
    status: 'pending' | 'awaiting' | 'active' | 'rejected';
    ic_number?: string | null;
    phone?: string | null;
    email_verified_at?: string | null;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    locale?: 'en' | 'ms';
    translations?: Record<'en' | 'ms', Record<string, string>>;
    flash?: {
        success?: string | null;
        error?: string | null;
    };
};