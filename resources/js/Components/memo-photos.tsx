import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, useState } from 'react';

import { Dialog, DialogContent, DialogTitle } from '@/Components/ui/dialog';
import { useI18n } from '@/lib/i18n';
import type { PhotoInfo } from '@/lib/photo';

/**
 * Inline photo carousel for a memo: one image at a time with swipe, arrows and
 * dots. Tapping an image opens the full-size lightbox. Dependency-free — it
 * uses native scroll-snap, so touch swiping works everywhere.
 */
export default function MemoPhotos({ photos }: { photos: PhotoInfo[] }) {
    const { t } = useI18n();
    const trackRef = useRef<HTMLDivElement>(null);
    const [index, setIndex] = useState(0);
    const [open, setOpen] = useState(false);

    if (photos.length === 0) {
        return null;
    }

    const single = photos.length === 1;

    const goTo = (next: number) => {
        const track = trackRef.current;

        if (!track) {
            return;
        }

        const clamped = Math.max(0, Math.min(photos.length - 1, next));
        track.scrollTo({ left: clamped * track.clientWidth, behavior: 'smooth' });
        setIndex(clamped);
    };

    const onScroll = () => {
        const track = trackRef.current;

        if (track) {
            setIndex(Math.round(track.scrollLeft / track.clientWidth));
        }
    };

    return (
        <div className="relative mt-3 overflow-hidden rounded-xl border">
            <div
                ref={trackRef}
                onScroll={onScroll}
                className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {photos.map((photo, i) => (
                    <button
                        key={photo.id}
                        type="button"
                        onClick={() => setOpen(true)}
                        aria-label={`${t('view_photo')} ${i + 1}`}
                        className="w-full shrink-0 snap-center"
                    >
                        <img
                            src={photo.thumb}
                            alt=""
                            loading="lazy"
                            draggable={false}
                            className="aspect-video w-full object-cover"
                        />
                    </button>
                ))}
            </div>

            {!single && (
                <>
                    <button
                        type="button"
                        onClick={() => goTo(index - 1)}
                        disabled={index === 0}
                        aria-label={t('previous')}
                        className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-opacity disabled:pointer-events-none disabled:opacity-0"
                    >
                        <ChevronLeft className="size-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => goTo(index + 1)}
                        disabled={index === photos.length - 1}
                        aria-label={t('next')}
                        className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-opacity disabled:pointer-events-none disabled:opacity-0"
                    >
                        <ChevronRight className="size-4" />
                    </button>

                    <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                        {photos.map((photo, i) => (
                            <button
                                key={photo.id}
                                type="button"
                                onClick={() => goTo(i)}
                                aria-label={`${t('photo')} ${i + 1}`}
                                className={`size-1.5 rounded-full transition-colors ${
                                    i === index ? 'bg-white' : 'bg-white/50'
                                }`}
                            />
                        ))}
                    </div>

                    <span className="absolute right-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-medium text-white">
                        {index + 1}/{photos.length}
                    </span>
                </>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-3xl p-2">
                    <DialogTitle className="sr-only">{t('photo')}</DialogTitle>
                    <img
                        src={photos[index].url}
                        alt=""
                        className="max-h-[80vh] w-full rounded-lg object-contain"
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
