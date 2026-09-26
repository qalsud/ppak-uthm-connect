<?php

namespace App\Notifications;

use App\Models\User;

class NewRegistrationNotification extends BaseNotification
{
    public function __construct(private User $registrant) {}

    public function title(): string
    {
        return 'Pendaftaran baharu / New registration';
    }

    public function body(): string
    {
        return $this->registrant->name.' ('.$this->registrant->role->label().') · '.$this->registrant->email;
    }

    public function url(): ?string
    {
        return route('admin.registrations.index');
    }
}
