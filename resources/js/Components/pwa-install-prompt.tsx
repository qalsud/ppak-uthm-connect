import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/Components/ui/button';
import { useI18n } from '@/lib/i18n';
import {
    INSTALL_DISMISSED_KEY,
    isIos,
    isStandalone,
    type BeforeInstallPromptEvent,
} from '@/lib/pwa';

/**
 * A small install prompt for the PWA. Chrome/Edge fire `beforeinstallprompt`;
 * iOS never does, so it gets a one-time "Share → Add to Home Screen" hint.
 */
export default function PwaInstallPrompt() {
    const { t } = useI18n();
    const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
    const [visible, setVisible] = useState(false);
    const [ios, setIos] = useState(false);

    useEffect(() => {
        if (isStandalone() || localStorage.getItem(INSTALL_DISMISSED_KEY) === '1') {
            return;
        }

        const iosDevice = isIos();
        setIos(iosDevice);

        const onPrompt = (event: Event) => {
            event.preventDefault();
            setDeferred(event as BeforeInstallPromptEvent);
            setVisible(true);
        };

        const onInstalled = () => {
            localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
            setVisible(false);
            setDeferred(null);
        };

        window.addEventListener('beforeinstallprompt', onPrompt);
        window.addEventListener('appinstalled', onInstalled);

        // iOS has no install event; show the manual instructions once instead.
        if (iosDevice) {
            setVisible(true);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', onPrompt);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    if (!visible) {
        return null;
    }

    const install = async () => {
        if (!deferred) {
            return;
        }

        await deferred.prompt();
        const choice = await deferred.userChoice;

        if (choice.outcome === 'accepted') {
            localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
            setVisible(false);
        }
        setDeferred(null);
    };

    const dismiss = () => {
        localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
        setVisible(false);
    };

    return (
        <div
            className="fixed inset-x-4 bottom-24 z-50 lg:bottom-6 lg:left-auto lg:right-6 lg:w-96"
            role="status"
            aria-live="polite"
        >
            <div className="flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-xl shadow-black/10">
                <img
                    src="/icons/icon-192.png"
                    alt=""
                    className="size-10 shrink-0 rounded-xl"
                    width={40}
                    height={40}
                />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{t('install_app')}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {ios ? t('install_app_ios') : t('install_app_desc')}
                    </p>
                    <div className="mt-3 flex gap-2">
                        {!ios && deferred && (
                            <Button size="sm" className="gap-1.5" onClick={install}>
                                <Download className="size-3.5" />
                                {t('install')}
                            </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={dismiss}>
                            {t('not_now')}
                        </Button>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={dismiss}
                    aria-label={t('dismiss')}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent"
                >
                    <X className="size-4" />
                </button>
            </div>
        </div>
    );
}
