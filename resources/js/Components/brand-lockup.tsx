/**
 * The official PPAK + UTHM lockup: both logos side by side with a thin divider.
 * `pill` puts them on a white rounded backing (for navy surfaces);
 * `plain` is for light backgrounds.
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
            ? 'rounded-full bg-white px-5 py-2.5 shadow-lg sm:px-7 sm:py-3.5'
            : '';

    const divider = variant === 'pill' ? 'bg-slate-200' : 'bg-slate-200';

    return (
        <span
            className={`inline-flex items-center gap-4 sm:gap-6 ${shell} ${className}`}
        >
            <img
                src="/images/logo-ppak.png"
                alt="PPAK UTHM"
                className="h-14 w-auto shrink-0 object-contain sm:h-[4.5rem]"
            />
            <span aria-hidden className={`h-12 w-px shrink-0 sm:h-16 ${divider}`} />
            <img
                src="/images/logo-uthm.png"
                alt="Universiti Tun Hussein Onn Malaysia"
                className="h-10 w-auto shrink-0 object-contain sm:h-12"
            />
        </span>
    );
}
