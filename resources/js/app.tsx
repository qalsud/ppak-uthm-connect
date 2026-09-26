import '../css/app.css';
import './bootstrap';

import { createInertiaApp, usePage } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { Toaster } from '@/Components/ui/sonner';
import type { PageProps } from '@/types';

const appName = import.meta.env.VITE_APP_NAME || 'PPAK UTHM'

function FlashMessages() {
    const { props } = usePage<PageProps>();
    const flash = props.flash;

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    return null;
}

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <>
                <App {...props} />
                <FlashMessages />
                <Toaster position="top-right" richColors />
            </>,
        );
    },
    progress: {
        color: '#2d6abb',
    },
});