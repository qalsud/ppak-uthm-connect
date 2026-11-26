<?php

namespace App\Notifications;

use App\Models\FinancialRecord;

class FeeRecordAddedNotification extends BaseNotification
{
    public function __construct(private FinancialRecord $record) {}

    public function category(): string
    {
        return self::CATEGORY_FEES;
    }

    public function studentId(): ?int
    {
        return $this->record->student_id;
    }

    public function title(): string
    {
        return 'Yuran baharu / New fee';
    }

    public function body(): string
    {
        return $this->record->student->name.' — '.$this->record->month
            .' (RM '.number_format((float) $this->record->amount, 2).')';
    }

    public function url(): ?string
    {
        return route('parent.financials.index');
    }
}
