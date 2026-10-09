import { Camera, RotateCcw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useI18n } from '@/lib/i18n';
import type { PhotoInfo } from '@/lib/photo';

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Multi-photo picker for the memo form. Shows already-saved photos (with a
 * remove/undo toggle) alongside newly-picked files, capped at `max` in total.
 */
export default function PhotoPicker({
    files,
    onChange,
    existing = [],
    removed = [],
    onToggleExisting,
    max = 3,
    error,
}: {
    files: File[];
    onChange: (files: File[]) => void;
    existing?: PhotoInfo[];
    removed?: number[];
    onToggleExisting?: (id: number) => void;
    max?: number;
    error?: string;
}) {
    const { t } = useI18n();
    const inputRef = useRef<HTMLInputElement>(null);
    const [previews, setPreviews] = useState<string[]>([]);
    const [localError, setLocalError] = useState<string | null>(null);

    // Derive object-URL previews from the freshly-picked files.
    useEffect(() => {
        const urls = files.map((file) => URL.createObjectURL(file));
        setPreviews(urls);

        return () => urls.forEach((url) => URL.revokeObjectURL(url));
    }, [files]);

    const keptExisting = existing.filter((photo) => !removed.includes(photo.id));
    const remaining = max - keptExisting.length - files.length;

    const pick = (picked: FileList | null) => {
        setLocalError(null);

        if (!picked?.length) {
            return;
        }

        const next = [...files];

        for (const file of Array.from(picked)) {
            if (!file.type.startsWith('image/')) {
                setLocalError(t('photo_invalid_type'));

                continue;
            }

            if (file.size > MAX_BYTES) {
                setLocalError(t('photo_too_large'));

                continue;
            }

            if (keptExisting.length + next.length >= max) {
                setLocalError(t('photos_hint'));

                break;
            }

            next.push(file);
        }

        onChange(next);

        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-2">
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => pick(e.target.files)}
            />

            <div className="flex flex-wrap gap-2">
                {existing.map((photo) => {
                    const isRemoved = removed.includes(photo.id);

                    return (
                        <div key={`existing-${photo.id}`} className="relative">
                            <img
                                src={photo.thumb}
                                alt=""
                                className={`size-20 rounded-lg border object-cover ${isRemoved ? 'opacity-40' : ''}`}
                            />
                            <button
                                type="button"
                                onClick={() => onToggleExisting?.(photo.id)}
                                aria-label={isRemoved ? t('restore') : t('remove_photo')}
                                className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-white shadow"
                            >
                                {isRemoved ? (
                                    <RotateCcw className="size-3" />
                                ) : (
                                    <X className="size-3" />
                                )}
                            </button>
                        </div>
                    );
                })}

                {previews.map((src, index) => (
                    <div key={`new-${index}`} className="relative">
                        <img src={src} alt="" className="size-20 rounded-lg border object-cover" />
                        <button
                            type="button"
                            onClick={() => onChange(files.filter((_, i) => i !== index))}
                            aria-label={t('remove_photo')}
                            className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-white shadow"
                        >
                            <X className="size-3" />
                        </button>
                    </div>
                ))}

                {remaining > 0 && (
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground transition-colors hover:bg-muted/50"
                    >
                        <Camera className="size-5" />
                        <span className="text-[10px] font-medium">{t('add_photo')}</span>
                    </button>
                )}
            </div>

            <p className="text-[11px] text-muted-foreground">
                {t('photos')} · {t('photos_hint')}
            </p>
            {localError && <p className="text-xs text-destructive">{localError}</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}
