<?php

namespace App\Services\Files;

use App\Services\Images\ImageStore;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Stores uploaded documents (PDF / images) on the private disk, served only
 * through an authorised route. Images are normalised through the shared image
 * pipeline so scans are compressed and EXIF-stripped; PDFs are stored as-is.
 */
class DocumentStore
{
    private const PDF_MIMES = ['application/pdf'];

    private const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

    public const ALLOWED_MIMES = [...self::PDF_MIMES, ...self::IMAGE_MIMES];

    public function __construct(private ImageStore $images) {}

    /**
     * @param  array{watermark?: array<int, string>}  $options
     * @return array{disk: string, path: string, thumb_path: string|null, mime: string, size: int}
     */
    public function store(UploadedFile $file, string $directory = 'documents', array $options = []): array
    {
        $mime = (string) $file->getMimeType();

        if (in_array($mime, self::IMAGE_MIMES, true)) {
            $stored = $this->images->store($file, $directory, $options);

            return [
                'disk' => $stored->disk,
                'path' => $stored->path,
                'thumb_path' => $stored->thumbPath,
                'mime' => $stored->mime,
                'size' => $stored->size,
            ];
        }

        if (! in_array($mime, self::PDF_MIMES, true)) {
            throw new RuntimeException('Unsupported document type.');
        }

        $disk = config('media.disk');
        $path = trim($directory, '/').'/'.now()->format('Y/m').'/'.Str::ulid().'.pdf';

        Storage::disk($disk)->put($path, $file->get());

        return [
            'disk' => $disk,
            'path' => $path,
            'thumb_path' => null,
            'mime' => $mime,
            'size' => (int) Storage::disk($disk)->size($path),
        ];
    }

    public function delete(?string $disk, ?string ...$paths): void
    {
        $this->images->delete($disk, ...$paths);
    }
}
