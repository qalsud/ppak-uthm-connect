import { Toaster as Sonner, type ToasterProps } from 'sonner';

/**
 * Plain sonner Toaster — the default shadcn wrapper depends on next-themes
 * (Next.js only), which crashes the app outside a ThemeProvider.
 */
const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            position="top-right"
            richColors
            closeButton
            toastOptions={{
                classNames: {
                    toast: 'rounded-lg border bg-background text-foreground',
                },
            }}
            {...props}
        />
    );
};

export { Toaster };