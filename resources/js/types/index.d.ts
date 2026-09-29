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

export type PaginatorLink = {
    url: string | null;
    label: string;
    active: boolean;
};

export type Paginator<T> = {
    data: T[];
    links: PaginatorLink[];
    from: number | null;
    to: number | null;
    total: number;
    current_page: number;
    last_page: number;
};

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    locale?: 'en' | 'ms';
    translations?: Record<'en' | 'ms', Record<string, string>>;
    /** Admin-editable option lists, keyed by group. */
    lists?: Record<string, Array<{ value: string; label: string }>>;
    unreadMessages?: number;
    flash?: {
        success?: string | null;
        error?: string | null;
        import_report?: {
            imported: number;
            skipped: Array<{ line: number; reason: string }>;
        } | null;
    };
};