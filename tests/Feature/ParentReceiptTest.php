<?php

use App\Enums\UserRole;
use App\Models\FinancialRecord;
use App\Models\Student;
use App\Models\User;

function receiptChild(): array
{
    $parent = User::factory()->role(UserRole::Parent)->create();
    $student = Student::factory()->create(['parent_id' => $parent->id]);

    return [$parent, $student];
}

test('a parent can download a receipt for their own paid record', function () {
    [$parent, $student] = receiptChild();

    $record = FinancialRecord::create([
        'student_id' => $student->id,
        'month' => 'June',
        'amount' => 300,
        'overtime_hours' => 0,
        'status' => 'paid',
        'paid_on' => now(),
    ]);

    $response = $this->actingAs($parent)
        ->get(route('parent.financials.receipt', $record));

    $response->assertOk();
    expect($response->headers->get('content-type'))->toContain('pdf')
        ->and($record->fresh()->ReceiptGenerated)->toBeTrue();
});

test('a parent cannot download another family receipt', function () {
    [$parent] = receiptChild();
    [, $otherStudent] = receiptChild();

    $record = FinancialRecord::create([
        'student_id' => $otherStudent->id,
        'month' => 'June',
        'amount' => 300,
        'overtime_hours' => 0,
        'status' => 'paid',
        'paid_on' => now(),
    ]);

    $this->actingAs($parent)
        ->get(route('parent.financials.receipt', $record))
        ->assertForbidden();
});

test('an unpaid record has no receipt', function () {
    [$parent, $student] = receiptChild();

    $record = FinancialRecord::create([
        'student_id' => $student->id,
        'month' => 'July',
        'amount' => 300,
        'overtime_hours' => 0,
        'status' => 'unpaid',
    ]);

    $this->actingAs($parent)
        ->get(route('parent.financials.receipt', $record))
        ->assertNotFound();
});
