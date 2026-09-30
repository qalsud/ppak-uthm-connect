const TONES: Record<string, string> = {
    Good: 'bg-emerald-100 text-emerald-700',
    Average: 'bg-amber-100 text-amber-700',
    Poor: 'bg-rose-100 text-rose-700',
};

/**
 * Fallback palette for grades added via /admin/lists that have no explicit
 * tone. Picked deterministically from the value so a given grade always gets
 * the same colour instead of rendering untinted.
 */
const FALLBACKS = [
    'bg-sky-100 text-sky-700',
    'bg-violet-100 text-violet-700',
    'bg-teal-100 text-teal-700',
    'bg-fuchsia-100 text-fuchsia-700',
    'bg-indigo-100 text-indigo-700',
    'bg-orange-100 text-orange-700',
];

function toneFor(value: string): string {
    if (TONES[value]) {
        return TONES[value];
    }

    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }

    return FALLBACKS[hash % FALLBACKS.length];
}

/** A small coloured pill for a Good / Average / Poor rating. */
export default function RatingChip({ value, label }: { value: string; label?: string }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                value ? toneFor(value) : 'bg-slate-100 text-slate-600'
            }`}
        >
            {label ?? value}
        </span>
    );
}
