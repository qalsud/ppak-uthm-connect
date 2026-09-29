import type { ReactNode } from 'react';

import { Button } from '@/Components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { useI18n } from '@/lib/i18n';

/**
 * A dialog built for forms: header and footer stay pinned while the field area
 * scrolls, so a long form (e.g. the student record) is fully usable on any
 * screen height. The rounded corners and viewport inset come from
 * `DialogContent`.
 */
export default function FormDialog({
    open,
    onOpenChange,
    title,
    description,
    onSubmit,
    submitLabel,
    processing = false,
    submitDisabled = false,
    cancelLabel,
    destructive = false,
    maxWidth = 'max-w-2xl',
    children,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    onSubmit?: () => void;
    submitLabel?: string;
    processing?: boolean;
    submitDisabled?: boolean;
    cancelLabel?: string;
    /** Style the submit button as a destructive action. */
    destructive?: boolean;
    maxWidth?: string;
    children: ReactNode;
}) {
    const { t } = useI18n();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={`p-0 ${maxWidth}`}>
                {/* Header — pinned, so the title stays visible while scrolling. */}
                <DialogHeader className="rounded-t-2xl border-b bg-background px-6 pb-4 pt-6">
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>

                {/* Body — the only part that scrolls. */}
                <div className="space-y-5 overflow-y-auto px-6 py-5">{children}</div>

                {/* Footer — pinned, so Save is always reachable. */}
                <DialogFooter className="rounded-b-2xl border-t bg-background px-6 pb-6 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={processing}
                    >
                        {cancelLabel ?? t('cancel')}
                    </Button>
                    {onSubmit && (
                        <Button
                            type="button"
                            onClick={onSubmit}
                            disabled={processing || submitDisabled}
                            variant={destructive ? 'destructive' : 'default'}
                        >
                            {processing ? t('saving') : (submitLabel ?? t('save'))}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
