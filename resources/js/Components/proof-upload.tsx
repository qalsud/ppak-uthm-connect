import { FileText, ImageIcon, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/Components/ui/button';
import { useI18n } from '@/lib/i18n';

const MAX_BYTES = 5 * 1024 * 1024;
const PDF_MIME = 'application/pdf';

export type Proof = {
    id: number;
    url: string;
    thumb: string;
    name: string | null;
    mime: string | null;
    is_pdf: boolean;
};

/** Small chip/link for a stored absence proof document. */
export function ProofLink({ proof, compact = false }: { proof: Proof; compact?: boolean }) {
    const { t } = useI18n();

    return (
        <a
            href={proof.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 rounded-lg border bg-background px-2 py-1 text-[11px] font-medium transition-colors hover:bg-muted"
        >
            {proof.is_pdf ? (
                <FileText className="size-3.5 shrink-0 text-rose-600" />
            ) : (
                <ImageIcon className="size-3.5 shrink-0 text-sky-600" />
            )}
            <span className="truncate">{compact ? t('absence_proof') : proof.name ?? t('absence_proof')}</span>
            <span className="shrink-0 text-muted-foreground">{t('absence_proof_view')}</span>
        </a>
    );
}

/**
 * Optional proof-of-absence picker. Accepts images or a PDF, shows a preview
 * for images and a document chip for PDFs.
 */
export default function ProofUpload({
    value,
    onChange,
    hint,
    error,
}: {
    value: File | null;
    onChange: (file: File | null) => void;
    hint?: string;
    error?: string;
}) {
    const { t } = useI18n();
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [localError, setLocalError] = useState<string | null>(null);

    const isPdf = value?.type === PDF_MIME;

    useEffect(() => {
        if (!value || isPdf) {
            setPreview(null);

            return;
        }

        const url = URL.createObjectURL(value);
        setPreview(url);

        return () => URL.revokeObjectURL(url);
    }, [value, isPdf]);

    const pick = (file: File | null) => {
        setLocalError(null);

        if (!file) {
            onChange(null);

            return;
        }

        const ok = file.type === PDF_MIME || file.type.startsWith('image/');

        if (!ok) {
            setLocalError(t('proof_type_invalid'));

            return;
        }

        if (file.size > MAX_BYTES) {
            setLocalError(t('proof_too_large'));

            return;
        }

        onChange(file);
    };

    const clear = () => {
        onChange(null);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-2">
            <input
                ref={inputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => pick(e.target.files?.[0] ?? null)}
            />

            {value ? (
                <div className="space-y-2">
                    {preview ? (
                        <div className="overflow-hidden rounded-xl border">
                            <img src={preview} alt="" className="max-h-48 w-full object-contain" />
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2.5">
                            <FileText className="size-5 shrink-0 text-rose-600" />
                            <span className="min-w-0 flex-1 truncate text-xs font-medium">{value.name}</span>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => inputRef.current?.click()}
                        >
                            {t('change_photo')}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-destructive"
                            onClick={clear}
                        >
                            <X className="size-3.5" />
                            {t('remove_photo')}
                        </Button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex w-full items-center gap-3 rounded-xl border border-dashed px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/50"
                >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                        <FileText className="size-4" />
                    </span>
                    <span className="min-w-0">
                        <span className="block text-xs font-semibold">{t('absence_proof_attach')}</span>
                        <span className="block text-[11px] text-muted-foreground">{t('absence_proof_hint')}</span>
                    </span>
                </button>
            )}

            {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
            {localError && <p className="text-xs text-destructive">{localError}</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}
