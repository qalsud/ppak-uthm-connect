import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export default function EmptyState({
    icon: Icon,
    title,
    description,
    action,
}: {
    icon: LucideIcon;
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <Icon className="size-6" />
            </span>
            <p className="mt-1 text-sm font-semibold text-foreground">{title}</p>
            {description && (
                <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
            )}
            {action && <div className="mt-3">{action}</div>}
        </div>
    );
}