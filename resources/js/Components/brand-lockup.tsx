/**
 * The official PPAK + UTHM lockup: both logos side by side with a thin divider.
 * `pill` puts them on a white rounded backing (for navy surfaces); `plain` is
 * for light backgrounds.
 */
export default function BrandLockup({
    variant = 'pill',
    className = '',
}: {
    variant?: 'pill' | 'plain';
    className?: string;
}) {
    const shell =
        variant === 'pill'
            ? 'rounded-full bg-white px-6 py-3 shadow-lg ring-1 ring-black/5 sm:px-9 sm:py-4'
            : '';

    return (
        <span className={`inline-flex items-center gap-4 sm:gap-6 ${shell} ${className}`}>
            <img
                src="/images/logo-ppak.png"
                alt="PPAK UTHM"
                className="h-16 w-auto shrink-0 object-contain sm:h-20"
            />
            <span aria-hidden className="h-12 w-px shrink-0 bg-slate-200 sm:h-16" />
            <img
                src="/images/logo-uthm.png"
                alt="Universiti Tun Hussein Onn Malaysia"
                className="h-11 w-auto shrink-0 object-contain sm:h-14"
            />
        </span>
    );
}
