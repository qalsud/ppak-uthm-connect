import { Camera, RotateCcw, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/Components/ui/button';
import { useI18n } from '@/lib/i18n';

const MAX_BYTES = 10 * 1024 * 1024;

/** Reusable camera/gallery picker with preview and client-side validation. */
export default function PhotoUpload({
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

    // Derive the preview from the selected file (and clean up the object URL).
    useEffect(() => {
        if (!value) {
            setPreview(null);

            return;
        }

        const url = URL.createObjectURL(value);
        setPreview(url);

        return () => URL.revokeObjectURL(url);
    }, [value]);

    const pick = (file: File | null) => {
        setLocalError(null);

        if (!file) {
            onChange(null);

            return;
        }

        if (!file.type.startsWith('image/')) {
            setLocalError(t('photo_invalid_type'));

            return;
        }

        if (file.size > MAX_BYTES) {
            setLocalError(t('photo_too_large'));

            return;
        }

        onChange(file);
    };

    return (
        <div className="space-y-2">
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => pick(e.target.files?.[0] ?? null)}
            />

            {preview ? (
                <div className="space-y-2">
                    <div className="overflow-hidden rounded-xl border">
                        <img src={preview} alt="" className="max-h-64 w-full object-contain" />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => inputRef.current?.click()}
                        >
                            <RotateCcw className="size-4" />
                            {t('change_photo')}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => {
                                onChange(null);
                                if (inputRef.current) {
                                    inputRef.current.value = '';
                                }
                            }}
                        >
                            {t('remove_photo')}
                        </Button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center transition-colors hover:bg-muted/50"
                >
                    <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                        <Camera className="size-5" />
                    </span>
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                        <Upload className="size-4" />
                        {t('take_photo')}
                    </span>
                </button>
            )}

            {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
            {localError && <p className="text-xs text-destructive">{localError}</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}
