<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Feature tests render Inertia pages but should not depend on a local
        // Vite build. The manifest is gitignored, so CI would otherwise fail
        // with "Vite manifest not found" on every page-rendering test.
        $this->withoutVite();
    }
}
