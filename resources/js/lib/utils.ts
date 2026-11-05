import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/** Up to two initials from a display name, e.g. "Nur Aisyah" → "NA". */
export function initials(name?: string | null, fallback = 'U'): string {
    const parts = (name ?? fallback).trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
        return fallback;
    }

    return parts
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
}

/** `RM 310.00` — one formatter so amounts look identical everywhere. */
export function formatMoney(value: number | string, decimals = 2): string {
    const amount = Number(value);

    return `RM ${(Number.isFinite(amount) ? amount : 0).toFixed(decimals)}`;
}