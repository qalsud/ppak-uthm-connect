/**
 * Today's date in the user's local timezone as `YYYY-MM-DD`.
 * (Avoids the UTC drift that `new Date().toISOString()` introduces.)
 */
export function localDate(date: Date = new Date()): string {
    const offsetMs = date.getTimezoneOffset() * 60000;

    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

export default localDate;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
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