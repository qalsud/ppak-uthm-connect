<?php

namespace App\Models\Concerns;

use App\Services\Images\ImageStore;

/**
 * Shared behaviour for models that store an image on a private disk and expose
 * it through an authorised route. Consumers define `imageRouteName()`.
 */
trait HasStoredImage
{
    /** @return string The named route that streams this image. */
    abstract protected function imageRouteName(): string;

    public function url(): string
    {
        // Route parameter differs per model (photo vs attachment); derive it
        // from the route's own placeholder so HasStoredImage stays generic.
        return route($this->imageRouteName(), [$this->imageRouteParameter() => $this]);
    }

    public function thumbUrl(): string
    {
        return $this->thumb_path
            ? route($this->imageRouteName(), [$this->imageRouteParameter() => $this, 'variant' => 'thumb'])
            : $this->url();
    }

    /** The route placeholder this model binds to (defaults to `photo`). */
    protected function imageRouteParameter(): string
    {
        return 'photo';
    }

    /** Shape used by the frontend. */
    public function payload(): array
    {
        return [
            'id' => $this->id,
            'url' => $this->url(),
            'thumb' => $this->thumbUrl(),
            'note' => $this->note,
            'uploaded_by' => $this->uploadedBy?->name,
            'created_at' => $this->created_at?->format('Y-m-d H:i'),
            'name' => $this->original_name ?? null,
            'mime' => $this->mime ?? null,
        ];
    }

    protected static function bootHasStoredImage(): void
    {
        static::deleting(function (self $photo): void {
            app(ImageStore::class)->delete($photo->disk, $photo->path, $photo->thumb_path);
        });
    }
}
