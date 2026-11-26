<?php

use App\Support\Csv;

test('csv exports do not turn user text into spreadsheet formulas', function () {
    $response = Csv::download('test.csv', ['Name'], [
        ['=SUM(A1:A2)'],
        ['+CMD'],
        ['@user'],
        ['-2'],
        ['Normal name'],
    ]);

    ob_start();
    $response->sendContent();
    $content = (string) ob_get_clean();

    expect($content)
        ->toContain("'=SUM(A1:A2)")
        ->toContain("'+CMD")
        ->toContain("'@user")
        ->toContain("'-2")
        ->toContain('Normal name');
});
