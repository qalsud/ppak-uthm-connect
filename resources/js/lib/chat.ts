import { formatDate } from '@/lib/date';

/** Today's date in the user's timezone as `YYYY-MM-DD`. */
export function todayIso(): string {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;

    return new Date(d.getTime() - offset).toISOString().slice(0, 10);
}

/** Human day heading for a message group (Today / Yesterday / date). */
export function dayLabel(date: string | null, t: (key: string) => string): string {
    if (!date) {
        return '';
    }

    if (date === todayIso()) {
        return t('today');
    }

    const yesterday = new Date(Date.now() - 86400000);
    const yIso = new Date(
        yesterday.getTime() - yesterday.getTimezoneOffset() * 60000,
    )
        .toISOString()
        .slice(0, 10);

    return date === yIso ? t('yesterday') : formatDate(date);
}
