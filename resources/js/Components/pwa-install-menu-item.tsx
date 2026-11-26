import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';

import { DropdownMenuItem } from '@/Components/ui/dropdown-menu';
import { useI18n } from '@/lib/i18n';
import {
    INSTALL_DISMISSED_KEY,
    isStandalone,
    type BeforeInstallPromptEvent,
} from '@/lib/pwa';

/**
 * A persistent fallback for the install banner: Chrome/Edge expose the native
 * prompt here even after the user dismisses the banner.
 */
export default function PwaInstallMenuItem() {
    const { t } = useI18n();
    const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        if (isStandalone()) {
            return;
        }

        const onPrompt = (event: Event) => {
            event.preventDefault();
            setDeferred(event as BeforeInstallPromptEvent);
        };

        const onInstalled = () => {
            localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
            setDeferred(null);
        };

        window.addEventListener('beforeinstallprompt', onPrompt);
        window.addEventListener('appinstalled', onInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', onPrompt);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    if (!deferred) {
        return null;
    }

    const install = async () => {
        await deferred.prompt();
        const choice = await deferred.userChoice;

        if (choice.outcome === 'accepted') {
            localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
        }
        setDeferred(null);
    };

    return (
        <DropdownMenuItem onClick={install}>
            <Download className="size-4" />
            {t('install_app')}
        </DropdownMenuItem>
    );
}
