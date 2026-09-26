/**
 * Today's date in the user's local timezone as `YYYY-MM-DD`.
 * (Avoids the UTC drift that `new Date().toISOString()` introduces.)
 */
export function localDate(date: Date = new Date()): string {
    const offsetMs = date.getTimezoneOffset() * 60000;

    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

export default localDate;