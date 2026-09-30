<?php

namespace App\Services\Images;

use GdImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Reusable image pipeline: validates, auto-orients, strips EXIF, downscales,
 * overlays a proof-of-delivery watermark, compresses toward a target size and
 * generates a thumbnail. Everything is stored on a private disk.
 */
class ImageStore
{
    /**
     * @param  array{watermark?: array<int, string>}  $options
     */
    public function store(UploadedFile $file, string $directory = 'uploads', array $options = []): StoredImage
    {
        $source = $file->getRealPath();
        $info = @getimagesize($source);

        if ($info === false || ($info[0] ?? 0) < 1 || ($info[1] ?? 0) < 1) {
            throw new RuntimeException('The file is not a valid image.');
        }

        $mime = $info['mime'] ?? '';

        if (! in_array($mime, config('media.allowed_mimes'), true)) {
            throw new RuntimeException('Unsupported image type.');
        }

        $image = $this->orient($this->load($source, $mime), $source, $mime);
        $width = imagesx($image);
        $height = imagesy($image);

        // 1. Downscale to the maximum dimension.
        [$fullW, $fullH] = $this->fit($width, $height, (int) setting('media.max_dimension', config('media.max_dimension')));
        $full = $this->resize($image, $fullW, $fullH);

        // 2. Stamp the proof-of-delivery watermark (child name + date/time).
        if (setting('media.watermark_enabled', config('media.watermark_enabled')) && ! empty($options['watermark'])) {
            $this->watermark($full, $options['watermark']);
        }

        // 3. Thumbnail, derived from the stamped image so both match.
        [$thumbW, $thumbH] = $this->fit($fullW, $fullH, (int) config('media.thumb_dimension'));
        $thumb = $this->resize($full, $thumbW, $thumbH);

        // 4. Compress toward the target size (lower quality / dimensions).
        $quality = (int) config('media.quality');
        [$full, $quality] = $this->compress($full, $quality, (int) setting('media.target_kb', config('media.target_kb')));

        $finalW = imagesx($full);
        $finalH = imagesy($full);

        $disk = config('media.disk');
        $folder = trim($directory, '/').'/'.now()->format('Y/m');
        $path = $folder.'/'.Str::ulid().'.jpg';
        $thumbPath = $folder.'/'.Str::ulid().'-thumb.jpg';

        Storage::disk($disk)->put($path, $this->encode($full, $quality));
        Storage::disk($disk)->put($thumbPath, $this->encode($thumb, (int) config('media.quality')));

        $size = (int) Storage::disk($disk)->size($path);

        imagedestroy($image);
        imagedestroy($full);
        imagedestroy($thumb);

        return new StoredImage(
            disk: $disk,
            path: $path,
            thumbPath: $thumbPath,
            mime: 'image/jpeg',
            size: $size,
            width: $finalW,
            height: $finalH,
        );
    }

    public function delete(?string $disk, ?string ...$paths): void
    {
        foreach ($paths as $path) {
            if ($path) {
                Storage::disk($disk ?? config('media.disk'))->delete($path);
            }
        }
    }

    private function load(string $path, string $mime): GdImage
    {
        $image = match ($mime) {
            'image/jpeg' => @imagecreatefromjpeg($path),
            'image/png' => @imagecreatefrompng($path),
            'image/webp' => @imagecreatefromwebp($path),
            default => false,
        };

        if ($image === false) {
            throw new RuntimeException('The image could not be processed.');
        }

        return $image;
    }

    private function orient(GdImage $image, string $path, string $mime): GdImage
    {
        if ($mime !== 'image/jpeg' || ! function_exists('exif_read_data')) {
            return $image;
        }

        $orientation = @exif_read_data($path)['Orientation'] ?? null;

        $rotated = match ($orientation) {
            3 => imagerotate($image, 180, 0),
            6 => imagerotate($image, -90, 0),
            8 => imagerotate($image, 90, 0),
            default => $image,
        };

        return $rotated ?: $image;
    }

    /** @return array{0:int,1:int} */
    private function fit(int $width, int $height, int $max): array
    {
        if ($max <= 0 || ($width <= $max && $height <= $max)) {
            return [$width, $height];
        }

        $ratio = $width > $height ? $max / $width : $max / $height;

        return [max(1, (int) round($width * $ratio)), max(1, (int) round($height * $ratio))];
    }

    private function resize(GdImage $source, int $width, int $height): GdImage
    {
        $target = imagecreatetruecolor($width, $height);

        // Flatten transparency onto white so JPEGs never show black boxes.
        $white = imagecolorallocate($target, 255, 255, 255);
        imagefilledrectangle($target, 0, 0, $width, $height, $white);

        imagecopyresampled(
            $target,
            $source,
            0,
            0,
            0,
            0,
            $width,
            $height,
            imagesx($source),
            imagesy($source),
        );

        return $target;
    }

    /**
     * Reduce quality (then dimensions) until the encoded image fits the target.
     *
     * @return array{0:GdImage,1:int}
     */
    private function compress(GdImage $image, int $quality, int $targetKb): array
    {
        if ($targetKb <= 0) {
            return [$image, $quality];
        }

        $target = $targetKb * 1024;
        $q = $quality;
        $current = $image;

        for ($i = 0; $i < 10; $i++) {
            $bytes = strlen($this->encode($current, $q));

            if ($bytes <= $target) {
                break;
            }

            // First reduce quality, then shrink using an area-based estimate.
            if ($q > 40) {
                $q -= 10;

                continue;
            }

            $factor = max(0.6, min(0.92, sqrt($target / $bytes)));
            $next = $this->resize(
                $current,
                max(1, (int) round(imagesx($current) * $factor)),
                max(1, (int) round(imagesy($current) * $factor)),
            );

            if ($current !== $image) {
                imagedestroy($current);
            }

            $current = $next;
        }

        return [$current, $q];
    }

    /** @param array<int, string> $lines */
    private function watermark(GdImage $image, array $lines): void
    {
        $font = (string) config('media.watermark_font');
        $width = imagesx($image);
        $height = imagesy($image);

        if ($font === '' || ! is_file($font) || ! function_exists('imagettftext')) {
            return;
        }

        $fontSize = max(16, (int) round($width * 0.032));
        $padding = (int) round($fontSize * 0.6);
        $lineHeight = (int) round($fontSize * 1.4);

        imagealphablending($image, true);

        $textWidth = 0;

        foreach ($lines as $line) {
            $textWidth = max($textWidth, $this->textWidth($font, $fontSize, $line));
        }

        $bandWidth = $textWidth + $padding * 2;
        $bandHeight = $lineHeight * count($lines) + $padding * 2;
        $left = $padding;
        $top = max($padding, $height - $bandHeight - $padding);

        // Translucent dark band so the text stays legible on any photo.
        $band = imagecolorallocatealpha($image, 0, 0, 0, 45);
        imagefilledrectangle($image, $left, $top, $left + $bandWidth, $top + $bandHeight, $band);

        $white = imagecolorallocate($image, 255, 255, 255);
        $baseline = $top + $padding + $fontSize;

        foreach ($lines as $line) {
            imagettftext($image, $fontSize, 0, $left + $padding, $baseline, $white, $font, $line);
            $baseline += $lineHeight;
        }
    }

    private function textWidth(string $font, int $size, string $text): int
    {
        $box = @imagettfbbox($size, 0, $font, $text);

        if ($box === false) {
            return (int) (mb_strlen($text) * $size * 0.6);
        }

        return abs($box[2] - $box[0]);
    }

    private function encode(GdImage $image, int $quality): string
    {
        ob_start();
        imagejpeg($image, null, $quality);

        return (string) ob_get_clean();
    }
}
