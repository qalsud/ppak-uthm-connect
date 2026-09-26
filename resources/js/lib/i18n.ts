import { usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';

type SharedProps = PageProps<{
    locale: 'en' | 'ms';
    translations: Record<'en' | 'ms', Record<string, string>>;
}>;

/**
 * Minimal dictionary helper. Keys are shared from the backend lang files
 * (resources/lang/{en,ms}.json) so PHP and React use the same translations.
 */
export function useI18n() {
    const { props } = usePage<SharedProps>();
    const locale = props.locale ?? 'en';
    const dict = props.translations?.[locale] ?? {};

    const t = (key: string, fallback?: string): string => {
        return dict[key] ?? fallback ?? key;
    };

    return { locale, t };
}

export default useI18n;