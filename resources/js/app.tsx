import '../css/app.css';
import './bootstrap';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { toast } from 'sonner';

import { Toaster } from '@/Components/ui/sonner';
import type { PageProps } from '@/types';

const appName = import.meta.env.VITE_APP_NAME || 'PPAK UTHM';

/**
 * Show flash toasts from server responses. Lives outside the React tree, so it
 * uses Inertia events instead of usePage() (which would crash if called here).
 */
function toastFlash(props: { flash?: PageProps['flash'] } | undefined) {
    const flash = props?.flash;

    if (flash?.success) {
        toast.success(flash.success);
    }
    if (flash?.error) {
        toast.error(flash.error);
    }
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

        // Toast any flash carried by the very first page load.
        toastFlash(props.initialPage.props as PageProps);

        // Toast flash messages on subsequent Inertia navigations.
        router.on('success', (event) => toastFlash(event.detail.page.props as PageProps));

        root.render(
            <>
                <App {...props} />
                <Toaster />
            </>,
        );
    },
    progress: {
        color: '#2d6abb',
    },
});