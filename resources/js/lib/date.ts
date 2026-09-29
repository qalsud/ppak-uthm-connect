/**
 * Today's date in the user's local timezone as `YYYY-MM-DD`.
 * (Avoids the UTC drift that `new Date().toISOString()` introduces.)
 */
export function localDate(date: Date = new Date()): string {
    const offsetMs = date.getTimezoneOffset() * 60000;

    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

export default localDate;

/** `YYYY-MM-DD` for today plus N days (local timezone). */
export function futureDate(daysAhead: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);

    return localDate(d);
}

/** Shift a `YYYY-MM-DD` string by N days, returning the same format. */
export function shiftDate(value: string, days: number): string {
    const [y, m, d] = value.slice(0, 10).split('-').map(Number);

    if (!y || !m || !d) {
        return value;
    }

    return localDate(new Date(y, m - 1, d + days));
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FULL_MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

/** Format `YYYY-MM-DD` as e.g. `Mon, 26 Sep 2026`. Returns `—` for empty input. */
export function formatDate(value?: string | null): string {
    if (!value) {
        return '—';
    }

    const [y, m, d] = value.slice(0, 10).split('-').map(Number);

    if (!y || !m || !d) {
        return value;
    }

    const dt = new Date(y, m - 1, d);

    return `${DAY_NAMES[dt.getDay()]}, ${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

/** Format `YYYY-MM-DD` as e.g. `Sunday, 27 September 2026`. */
export function formatFullDate(value?: string | null): string {
    if (!value) {
        return '—';
    }

    const [y, m, d] = value.slice(0, 10).split('-').map(Number);

    if (!y || !m || !d) {
        return value;
    }

    const dt = new Date(y, m - 1, d);

    return `${FULL_DAY_NAMES[dt.getDay()]}, ${d} ${FULL_MONTH_NAMES[m - 1]} ${y}`;
}