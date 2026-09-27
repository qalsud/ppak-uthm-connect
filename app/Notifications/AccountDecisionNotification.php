<?php

namespace App\Notifications;

class AccountDecisionNotification extends BaseNotification
{
    public function __construct(
        private string $name,
        private bool $approved,
        private ?string $reason = null,
    ) {}

    public function title(): string
    {
        return $this->approved
            ? 'Akaun diluluskan / Account approved'
            : 'Akaun ditolak / Account rejected';
    }

    public function body(): string
    {
        if ($this->approved) {
            return __('approval.account_approved_body', ['name' => $this->name]);
        }

        $body = __('approval.account_rejected_body', ['name' => $this->name]);

        return $this->reason
            ? $body.' '.__('approval.rejection_reason', ['reason' => $this->reason])
            : $body;
    }

    public function url(): ?string
    {
        return route('login');
    }
}
