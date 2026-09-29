<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\AuthorisedCollector;
use App\Models\EmergencyContact;
use App\Models\Guardian;
use App\Models\Student;
use App\Services\Images\ImageStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use RuntimeException;

/**
 * Manages the people around a child: guardians, ordered emergency contacts,
 * and the adults authorised to collect them. All three are edited from the
 * admin student page.
 */
class StudentContactController extends Controller
{
    public function storeGuardian(Request $request, Student $student): RedirectResponse
    {
        $data = $this->validateGuardian($request);

        $guardian = $student->guardians()->create($data);

        $this->syncPrimary($student, $guardian);

        ActivityLog::record('guardian.created', $student, $student->name, ['guardian' => $guardian->name]);

        return back()->with('success', __('approval.guardian_saved'));
    }

    public function updateGuardian(Request $request, Guardian $guardian): RedirectResponse
    {
        $guardian->update($this->validateGuardian($request));

        $this->syncPrimary($guardian->student, $guardian);

        ActivityLog::record('guardian.updated', $guardian->student, $guardian->name);

        return back()->with('success', __('approval.updated'));
    }

    public function destroyGuardian(Guardian $guardian): RedirectResponse
    {
        $student = $guardian->student;
        $guardian->delete();

        ActivityLog::record('guardian.deleted', $student, $student?->name);

        return back()->with('success', __('approval.deleted'));
    }

    public function storeEmergencyContact(Request $request, Student $student): RedirectResponse
    {
        $contact = $student->emergencyContacts()->create($this->validateContact($request));

        ActivityLog::record('emergency_contact.created', $student, $student->name, ['contact' => $contact->name]);

        return back()->with('success', __('approval.contact_saved'));
    }

    public function updateEmergencyContact(Request $request, EmergencyContact $contact): RedirectResponse
    {
        $contact->update($this->validateContact($request));

        return back()->with('success', __('approval.updated'));
    }

    public function destroyEmergencyContact(EmergencyContact $contact): RedirectResponse
    {
        $student = $contact->student;
        $contact->delete();

        ActivityLog::record('emergency_contact.deleted', $student, $student?->name);

        return back()->with('success', __('approval.deleted'));
    }

    public function storeCollector(Request $request, Student $student, ImageStore $images): RedirectResponse
    {
        $data = $this->validateCollector($request);

        $collector = $student->authorisedCollectors()->create($data);

        $this->storePhoto($request, $collector, $images);

        ActivityLog::record('collector.created', $student, $student->name, ['collector' => $collector->name]);

        return back()->with('success', __('approval.collector_saved'));
    }

    public function updateCollector(Request $request, AuthorisedCollector $collector, ImageStore $images): RedirectResponse
    {
        $collector->update($this->validateCollector($request));

        $this->storePhoto($request, $collector, $images);

        ActivityLog::record('collector.updated', $collector->student, $collector->name);

        return back()->with('success', __('approval.updated'));
    }

    public function destroyCollector(AuthorisedCollector $collector): RedirectResponse
    {
        $student = $collector->student;

        $images = app(ImageStore::class);
        $images->delete($collector->photo_disk, $collector->photo_path);

        $collector->delete();

        ActivityLog::record('collector.deleted', $student, $student?->name);

        return back()->with('success', __('approval.deleted'));
    }

    private function storePhoto(Request $request, AuthorisedCollector $collector, ImageStore $images): void
    {
        if (! $request->hasFile('photo')) {
            return;
        }

        try {
            $stored = $images->store($request->file('photo'), 'collectors');
        } catch (RuntimeException) {
            return;
        }

        $images->delete($collector->photo_disk, $collector->photo_path);

        $collector->update([
            'photo_disk' => $stored->disk,
            'photo_path' => $stored->path,
        ]);
    }

    /** Only one guardian may be flagged primary at a time. */
    private function syncPrimary(?Student $student, Guardian $guardian): void
    {
        if (! $student || ! $guardian->is_primary) {
            return;
        }

        $student->guardians()
            ->whereKeyNot($guardian->getKey())
            ->update(['is_primary' => false]);
    }

    private function validateGuardian(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'relationship' => ['required', Rule::in(Guardian::RELATIONSHIPS)],
            'ic_number' => ['nullable', 'string', 'max:30'],
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:255'],
            'occupation' => ['nullable', 'string', 'max:120'],
            'is_primary' => ['nullable', 'boolean'],
            'can_collect' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $data['is_primary'] = (bool) ($data['is_primary'] ?? false);
        $data['can_collect'] = (bool) ($data['can_collect'] ?? false);

        return $data;
    }

    private function validateContact(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'relationship' => ['nullable', 'string', 'max:40'],
            'phone' => ['required', 'string', 'max:40'],
            'priority' => ['nullable', 'integer', 'min:1', 'max:10'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $data['priority'] = (int) ($data['priority'] ?? 1);

        return $data;
    }

    private function validateCollector(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'relationship' => ['nullable', 'string', 'max:40'],
            'phone' => ['nullable', 'string', 'max:40'],
            'ic_number' => ['nullable', 'string', 'max:30'],
            'is_active' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'photo' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:'.(int) config('media.max_upload_kb'),
            ],
        ]);

        unset($data['photo']);

        $data['is_active'] = (bool) ($data['is_active'] ?? true);

        return $data;
    }
}
