<?php

namespace App\Services\Images;

/** Value object describing a stored image + its thumbnail. */
class StoredImage
{
    public function __construct(
        public readonly string $disk,
        public readonly string $path,
        public readonly ?string $thumbPath,
        public readonly string $mime,
        public readonly int $size,
        public readonly int $width,
        public readonly int $height,
    ) {}
}
