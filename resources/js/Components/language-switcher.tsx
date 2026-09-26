import { Link } from '@inertiajs/react';
import { Languages } from 'lucide-react';

import { Button } from '@/Components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { useI18n } from '@/lib/i18n';

export default function LanguageSwitcher() {
    const { locale, t } = useI18n();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t('language')}>
                    <Languages className="size-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                    <Link href="/locale/en" className={locale === 'en' ? 'font-bold' : ''}>
                        {t('english')}
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/locale/ms" className={locale === 'ms' ? 'font-bold' : ''}>
                        {t('malay')}
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
