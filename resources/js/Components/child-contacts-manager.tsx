import { router, useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';

import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Textarea } from '@/Components/ui/textarea';
import { useI18n } from '@/lib/i18n';
import { useList } from '@/lib/lists';

export type Guardian = {
    id: number;
    name: string;
    relationship: string;
    ic_number: string | null;
    phone: string | null;
    email: string | null;
    occupation: string | null;
    is_primary: boolean;
    can_collect: boolean;
    notes: string | null;
    has_account: boolean;
};

export type Contact = {
    id: number;
    name: string;
    relationship: string | null;
    phone: string;
    priority: number;
    notes: string | null;
};

export type CollectorRow = {
    id: number;
    name: string;
    relationship: string | null;
    phone: string | null;
    ic_number: string | null;
    photo_url: string | null;
    is_active: boolean;
    notes: string | null;
};

export type Contacts = {
    guardians: Guardian[];
    emergency_contacts: Contact[];
    collectors: CollectorRow[];
};

const RELATIONSHIPS = ['mother', 'father', 'guardian', 'other'];

/** Toggle-style pill used for plan flags. */
function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                on ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'
            }`}
        >
            {label}
        </button>
    );
}

/** Guardians, emergency contacts and authorised collectors for one child. */
export default function ChildContactsManager({
    studentId,
    contacts,
}: {
    studentId: number;
    contacts: Contacts;
}) {
    const { t } = useI18n();
    const [adding, setAdding] = useState<'guardian' | 'contact' | 'collector' | null>(null);
    const photoRef = useRef<HTMLInputElement>(null);
    const [photoFor, setPhotoFor] = useState<number | null>(null);

    const guardianForm = useForm({
        name: '',
        relationship: 'mother',
        ic_number: '',
        phone: '',
        email: '',
        occupation: '',
        is_primary: false,
        can_collect: true,
        notes: '',
    });

    const contactForm = useForm({
        name: '',
        relationship: '',
        phone: '',
        priority: '1',
        notes: '',
    });

    const collectorForm = useForm({
        name: '',
        relationship: '',
        phone: '',
        ic_number: '',
        is_active: true,
        notes: '',
        photo: null as File | null,
    });

    const saveGuardian = () =>
        guardianForm.post(route('admin.students.guardians.store', { student: studentId }), {
            preserveScroll: true,
            onSuccess: () => {
                guardianForm.reset();
                setAdding(null);
            },
        });

    const saveContact = () =>
        contactForm.post(route('admin.students.contacts.store', { student: studentId }), {
            preserveScroll: true,
            onSuccess: () => {
                contactForm.reset();
                setAdding(null);
            },
        });

    const saveCollector = () => {
        collectorForm.post(route('admin.students.collectors.store', { student: studentId }), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                collectorForm.reset();
                setAdding(null);
            },
        });
    };

    const pickPhoto = (id: number) => {
        setPhotoFor(id);
        photoRef.current?.click();
    };

    const uploadPhoto = (file: File | null) => {
        if (!file || photoFor === null) {
            return;
        }

        router.post(
            route('admin.collectors.update', { collector: photoFor }),
            { name: contacts.collectors.find((c) => c.id === photoFor)?.name ?? '', photo: file },
            {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => {
                    setPhotoFor(null);
                    if (photoRef.current) {
                        photoRef.current.value = '';
                    }
                },
            },
        );
    };

    return (
        <div className="space-y-4">
            <input
                ref={photoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => uploadPhoto(e.target.files?.[0] ?? null)}
            />

            {/* Guardians */}
            <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base">{t('guardians')}</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => setAdding('guardian')}>
                        {t('add_guardian')}
                    </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                    {contacts.guardians.length === 0 && adding !== 'guardian' && (
                        <p className="text-sm text-muted-foreground">{t('no_guardians')}</p>
                    )}

                    {contacts.guardians.map((g) => (
                        <div
                            key={g.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"
                        >
                            <div className="min-w-0">
                                <p className="text-sm font-medium">
                                    {g.name} · {t(`relationship.${g.relationship}`, g.relationship)}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    {[g.phone, g.email, g.ic_number, g.occupation].filter(Boolean).join(' · ')}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                                <Toggle on={g.is_primary} label={t('guardian.primary')} onClick={() => {}} />
                                <Toggle on={g.can_collect} label={t('guardian.can_collect')} onClick={() => {}} />
                                <button
                                    type="button"
                                    onClick={() =>
                                        router.delete(route('admin.guardians.destroy', { guardian: g.id }), {
                                            preserveScroll: true,
                                        })
                                    }
                                    className="text-[11px] text-muted-foreground hover:text-destructive"
                                >
                                    {t('delete')}
                                </button>
                            </div>
                        </div>
                    ))}

                    {adding === 'guardian' && (
                        <div className="space-y-3 rounded-xl border-2 border-primary/30 p-3">
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <Label>{t('name')}</Label>
                                    <Input
                                        value={guardianForm.data.name}
                                        onChange={(e) => guardianForm.setData('name', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('relationship')}</Label>
                                    <Select
                                        value={guardianForm.data.relationship}
                                        onValueChange={(v) => guardianForm.setData('relationship', v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {useList('guardian_relationship').map((r) => (
                                                <SelectItem key={r.value} value={r.value}>
                                                    {r.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('ic_number')}</Label>
                                    <Input
                                        value={guardianForm.data.ic_number}
                                        onChange={(e) => guardianForm.setData('ic_number', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('phone')}</Label>
                                    <Input
                                        value={guardianForm.data.phone}
                                        onChange={(e) => guardianForm.setData('phone', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('email')}</Label>
                                    <Input
                                        value={guardianForm.data.email}
                                        onChange={(e) => guardianForm.setData('email', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('occupation')}</Label>
                                    <Input
                                        value={guardianForm.data.occupation}
                                        onChange={(e) => guardianForm.setData('occupation', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <label className="flex items-center gap-2 text-xs">
                                    <input
                                        type="checkbox"
                                        className="size-4"
                                        checked={guardianForm.data.is_primary}
                                        onChange={(e) => guardianForm.setData('is_primary', e.target.checked)}
                                    />
                                    {t('guardian.primary')}
                                </label>
                                <label className="flex items-center gap-2 text-xs">
                                    <input
                                        type="checkbox"
                                        className="size-4"
                                        checked={guardianForm.data.can_collect}
                                        onChange={(e) => guardianForm.setData('can_collect', e.target.checked)}
                                    />
                                    {t('guardian.can_collect')}
                                </label>
                            </div>
                            {guardianForm.errors.name && (
                                <p className="text-xs text-destructive">{guardianForm.errors.name}</p>
                            )}
                            <div className="flex gap-2">
                                <Button onClick={saveGuardian} disabled={guardianForm.processing} size="sm">
                                    {t('save')}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setAdding(null)}>
                                    {t('cancel')}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Emergency contacts */}
            <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base">{t('emergency_contacts')}</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => setAdding('contact')}>
                        {t('add_emergency_contact')}
                    </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                    {contacts.emergency_contacts.length === 0 && adding !== 'contact' && (
                        <p className="text-sm text-muted-foreground">{t('no_emergency_contacts')}</p>
                    )}

                    {contacts.emergency_contacts.map((c) => (
                        <div
                            key={c.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"
                        >
                            <div className="min-w-0">
                                <p className="text-sm font-medium">{c.name}</p>
                                <p className="text-[11px] text-muted-foreground">
                                    {[c.relationship, c.phone].filter(Boolean).join(' · ')}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                    {t('contact_priority')} {c.priority}
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        router.delete(route('admin.contacts.destroy', { contact: c.id }), {
                                            preserveScroll: true,
                                        })
                                    }
                                    className="text-[11px] text-muted-foreground hover:text-destructive"
                                >
                                    {t('delete')}
                                </button>
                            </div>
                        </div>
                    ))}

                    {adding === 'contact' && (
                        <div className="space-y-3 rounded-xl border-2 border-primary/30 p-3">
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <Label>{t('name')}</Label>
                                    <Input
                                        value={contactForm.data.name}
                                        onChange={(e) => contactForm.setData('name', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('relationship')}</Label>
                                    <Input
                                        value={contactForm.data.relationship}
                                        onChange={(e) => contactForm.setData('relationship', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('phone')}</Label>
                                    <Input
                                        value={contactForm.data.phone}
                                        onChange={(e) => contactForm.setData('phone', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('contact_priority')}</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={contactForm.data.priority}
                                        onChange={(e) => contactForm.setData('priority', e.target.value)}
                                    />
                                </div>
                            </div>
                            {contactForm.errors.phone && (
                                <p className="text-xs text-destructive">{contactForm.errors.phone}</p>
                            )}
                            <div className="flex gap-2">
                                <Button onClick={saveContact} disabled={contactForm.processing} size="sm">
                                    {t('save')}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setAdding(null)}>
                                    {t('cancel')}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Authorised collectors */}
            <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base">{t('authorised_collectors')}</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => setAdding('collector')}>
                        {t('add_collector')}
                    </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                    <p className="text-[11px] text-muted-foreground">{t('collector_hint')}</p>

                    {contacts.collectors.length === 0 && adding !== 'collector' && (
                        <p className="text-sm text-muted-foreground">{t('no_collectors')}</p>
                    )}

                    {contacts.collectors.map((c) => (
                        <div
                            key={c.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3"
                        >
                            <div className="flex min-w-0 items-center gap-2.5">
                                {c.photo_url ? (
                                    <img
                                        src={c.photo_url}
                                        alt=""
                                        className="size-10 shrink-0 rounded-full object-cover"
                                    />
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => pickPhoto(c.id)}
                                        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed text-[10px] text-muted-foreground hover:border-primary/50"
                                    >
                                        {t('collector_photo')}
                                    </button>
                                )}
                                <div className="min-w-0">
                                    <p className="text-sm font-medium">{c.name}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {[c.relationship, c.phone, c.ic_number].filter(Boolean).join(' · ')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                                {!c.is_active && (
                                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                        {t('collector_inactive')}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => pickPhoto(c.id)}
                                    className="text-[11px] text-muted-foreground hover:text-foreground"
                                >
                                    {t('collector_photo')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        router.delete(route('admin.collectors.destroy', { collector: c.id }), {
                                            preserveScroll: true,
                                        })
                                    }
                                    className="text-[11px] text-muted-foreground hover:text-destructive"
                                >
                                    {t('delete')}
                                </button>
                            </div>
                        </div>
                    ))}

                    {adding === 'collector' && (
                        <div className="space-y-3 rounded-xl border-2 border-primary/30 p-3">
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <Label>{t('name')}</Label>
                                    <Input
                                        value={collectorForm.data.name}
                                        onChange={(e) => collectorForm.setData('name', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('relationship')}</Label>
                                    <Input
                                        value={collectorForm.data.relationship}
                                        onChange={(e) => collectorForm.setData('relationship', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('phone')}</Label>
                                    <Input
                                        value={collectorForm.data.phone}
                                        onChange={(e) => collectorForm.setData('phone', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('ic_number')}</Label>
                                    <Input
                                        value={collectorForm.data.ic_number}
                                        onChange={(e) => collectorForm.setData('ic_number', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label>{t('notes')}</Label>
                                <Textarea
                                    rows={2}
                                    value={collectorForm.data.notes}
                                    onChange={(e) => collectorForm.setData('notes', e.target.value)}
                                />
                            </div>
                            {collectorForm.errors.name && (
                                <p className="text-xs text-destructive">{collectorForm.errors.name}</p>
                            )}
                            <div className="flex gap-2">
                                <Button onClick={saveCollector} disabled={collectorForm.processing} size="sm">
                                    {t('save')}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setAdding(null)}>
                                    {t('cancel')}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
