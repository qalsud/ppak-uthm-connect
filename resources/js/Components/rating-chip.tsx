const TONES: Record<string, string> = {
    Good: 'bg-emerald-100 text-emerald-700',
    Average: 'bg-amber-100 text-amber-700',
    Poor: 'bg-rose-100 text-rose-700',
};

/** A small coloured pill for a Good / Average / Poor rating. */
export default function RatingChip({ value, label }: { value: string; label?: string }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                TONES[value] ?? 'bg-slate-100 text-slate-600'
            }`}
        >
            {label ?? value}
        </span>
    );
}
