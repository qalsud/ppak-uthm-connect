import { Badge } from '@/Components/ui/badge';

type Variant = 'paid' | 'unpaid' | 'active' | 'pending' | 'rejected' | 'awaiting' | 'neutral';

const styles: Record<Variant, string> = {
    paid: 'bg-emerald-100 text-emerald-700',
    active: 'bg-emerald-100 text-emerald-700',
    unpaid: 'bg-amber-100 text-amber-700',
    pending: 'bg-amber-100 text-amber-700',
    awaiting: 'bg-sky-100 text-sky-700',
    rejected: 'bg-rose-100 text-rose-700',
    neutral: 'bg-slate-100 text-slate-600',
};

export default function StatusBadge({ status, label }: { status: Variant; label?: string }) {
    return (
        <Badge className={`border-0 font-medium capitalize ${styles[status]}`}>
            {label ?? status}
        </Badge>
    );
}