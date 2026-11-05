<?php

use App\Services\Images\ImageStore;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('attendance');
    config()->set('media.disk', 'attendance');
});

test('an image above the pixel budget is rejected before processing', function () {
    config()->set('media.max_pixels', 500);

    $file = UploadedFile::fake()->image('huge.jpg', 100, 100);

    expect(fn () => app(ImageStore::class)->store($file))
        ->toThrow(RuntimeException::class, 'The image dimensions are too large.');
});

test('an image within the pixel budget is still processed', function () {
    config()->set('media.max_pixels', 20000);

    $file = UploadedFile::fake()->image('normal.jpg', 100, 100);

    $stored = app(ImageStore::class)->store($file);

    expect($stored->width)->toBeLessThanOrEqual(100)
        ->and(Storage::disk('attendance')->exists($stored->path))->toBeTrue();
});
