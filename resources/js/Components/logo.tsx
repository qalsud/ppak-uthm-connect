/**
 * Brand logos. Both source PNGs are dark artwork on transparency, so pass
 * `chip` to place them on a white rounded backing when used on navy surfaces.
 */
type Props = {
    variant?: 'ppak' | 'uthm';
    chip?: boolean;
    className?: string;
    alt?: string;
};

const SRC: Record<'ppak' | 'uthm', string> = {
    ppak: '/images/logo-ppak.png',
    uthm: '/images/logo-uthm.png',
};

export default function Logo({ variant = 'ppak', chip = false, className = '', alt }: Props) {
    const label = alt ?? (variant === 'ppak' ? 'PPAK UTHM' : 'UTHM');

    if (chip) {
        return (
            <span
                className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ${
                    variant === 'ppak' ? 'p-1' : 'px-2 py-1'
                } ${className}`}
            >
                <img src={SRC[variant]} alt={label} className="h-full w-full object-contain" />
            </span>
        );
    }

    return <img src={SRC[variant]} alt={label} className={`object-contain ${className}`} />;
}