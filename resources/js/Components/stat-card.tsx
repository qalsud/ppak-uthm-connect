import type { LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/Components/ui/card';

export default function StatCard({
    label,
    value,
    icon: Icon,
    hint,
}: {
    label: string;
    value: string | number;
    icon: LucideIcon;
    hint?: string;
}) {
    return (
        <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="flex items-center gap-3 py-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                    <p className="truncate text-xs text-muted-foreground">{label}</p>
                    <p className="truncate text-xl font-bold text-foreground">{value}</p>
                    {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
                </div>
            </CardContent>
        </Card>
    );
}