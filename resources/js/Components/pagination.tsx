import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

const clean = (label: string) => label.replace(/&laquo;|&raquo;|Previous|Next/g, '').trim();

/** Laravel paginator links, rendered for Inertia. */
export default function Pagination({
    links,
    from,
    to,
    total,
    className = '',
}: {
    links: PaginationLink[];
    from?: number | null;
    to?: number | null;
    total?: number | null;
    className?: string;
}) {
    if (!links || links.length <= 3) {
        return null;
    }

    return (
        <div className={`flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 ${className}`}>
            <p className="text-xs text-muted-foreground">
                {from ?? 0}–{to ?? 0} / {total ?? 0}
            </p>

            <div className="flex items-center gap-1">
                {links.map((link, index) => {
                    const isPrev = index === 0;
                    const isNext = index === links.length - 1;
                    const label = isPrev ? (
                        <ChevronLeft className="size-4" />
                    ) : isNext ? (
                        <ChevronRight className="size-4" />
                    ) : (
                        clean(link.label)
                    );

                    const base =
                        'flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors';

                    if (!link.url) {
                        return (
                            <span key={index} className={`${base} text-muted-foreground/50`}>
                                {label}
                            </span>
                        );
                    }

                    return (
                        <Link
                            key={index}
                            href={link.url}
                            preserveScroll
                            className={`${base} ${
                                link.active
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'hover:bg-muted'
                            }`}
                        >
                            {label}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
