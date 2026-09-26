import { CalendarDays } from 'lucide-react';

import { formatFullDate, localDate } from '@/lib/date';

/** Today's date as a compact chip for page headers. */
export default function DateChip({ className }: { className?: string }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground ${className ?? ''}`}
        >
            <CalendarDays className="size-3.5" />
            {formatFullDate(localDate())}
        </span>
    );
}
