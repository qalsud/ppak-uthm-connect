import { useState } from 'react';

import { Dialog, DialogContent, DialogTitle } from '@/Components/ui/dialog';
import type { PhotoInfo } from '@/lib/photo';

/** Small clickable thumbnail that opens the full-size photo. */
export default function PhotoThumb({
    photo,
    className = '',
    size = 'size-14',
}: {
    photo: PhotoInfo;
    className?: string;
    size?: string;
}) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={`overflow-hidden rounded-lg border ${className}`}
                title={photo.note ?? undefined}
            >
                <img
                    src={photo.thumb}
                    alt=""
                    loading="lazy"
                    className={`${size} object-cover transition-transform hover:scale-105`}
                />
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-3xl p-2">
                    <DialogTitle className="sr-only">Photo</DialogTitle>
                    <img
                        src={photo.url}
                        alt=""
                        className="max-h-[80vh] w-full rounded-lg object-contain"
                    />
                    {photo.note && (
                        <p className="px-2 pb-1 text-xs text-muted-foreground">{photo.note}</p>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
