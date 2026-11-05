<?php

use Inertia\Testing\AssertableInertia as Assert;

test('only the active locale dictionary is shared with Inertia', function () {
    $this->get('/')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Welcome')
            ->has('translations.en')
            ->missing('translations.ms')
        );

    $this->get(route('locale.switch', 'ms'))->assertRedirect();

    $this->get('/')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Welcome')
            ->has('translations.ms')
            ->missing('translations.en')
        );
});
