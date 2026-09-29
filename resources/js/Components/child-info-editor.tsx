import { useForm } from '@inertiajs/react';
import { ChevronRight, Pencil } from 'lucide-react';
import { useState } from 'react';

import type { StudentProfile } from '@/Components/student-profile-card';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { useI18n } from '@/lib/i18n';

/**
 * Collapsible form letting a parent keep their child's contact, health and
 * dietary details current. Medical detail is safety-critical, so changes are
 * logged for the office.
 */
export default function ChildInfoEditor({ childId, profile }: { childId: number; profile: StudentProfile }) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);

    const form = useForm({
        address: profile.address ?? '',
        allergies: profile.allergies ?? '',
        medical_notes: profile.medical_notes ?? '',
        dietary_restrictions: profile.dietary_restrictions ?? '',
        doctor_name: profile.doctor_name ?? '',
        doctor_phone: profile.doctor_phone ?? '',
        medical_consent: profile.medical_consent,
    });

    const submit = () =>
        form.patch(route('parent.children.profile', { student: childId }), {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
        });

    return (
        <Card className="mt-3 rounded-2xl border-0 shadow-sm">
            <CardContent className="pt-5">
                {!open ? (
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="group flex w-full items-center gap-3 rounded-xl border border-dashed px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/50"
                    >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                            <Pencil className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold">{t('update_child_info')}</span>
                            <span className="block text-[11px] text-muted-foreground">
                                {t('medical_consent_hint')}
                            </span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </button>
                ) : (
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label htmlFor="ci-address">{t('address')}</Label>
                            <Textarea
                                id="ci-address"
                                rows={2}
                                value={form.data.address}
                                onChange={(e) => form.setData('address', e.target.value)}
                            />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Label htmlFor="ci-allergies">{t('allergies')}</Label>
                                <Textarea
                                    id="ci-allergies"
                                    rows={2}
                                    value={form.data.allergies}
                                    onChange={(e) => form.setData('allergies', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="ci-diet">{t('dietary_restrictions')}</Label>
                                <Textarea
                                    id="ci-diet"
                                    rows={2}
                                    value={form.data.dietary_restrictions}
                                    onChange={(e) => form.setData('dietary_restrictions', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="ci-medical">{t('medical_notes')}</Label>
                            <Textarea
                                id="ci-medical"
                                rows={2}
                                value={form.data.medical_notes}
                                onChange={(e) => form.setData('medical_notes', e.target.value)}
                            />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Label htmlFor="ci-doctor">{t('doctor_name')}</Label>
                                <Input
                                    id="ci-doctor"
                                    value={form.data.doctor_name}
                                    onChange={(e) => form.setData('doctor_name', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="ci-doctor-phone">{t('doctor_phone')}</Label>
                                <Input
                                    id="ci-doctor-phone"
                                    value={form.data.doctor_phone}
                                    onChange={(e) => form.setData('doctor_phone', e.target.value)}
                                />
                            </div>
                        </div>

                        <label className="flex items-start gap-2.5 rounded-xl border p-3">
                            <input
                                type="checkbox"
                                className="mt-0.5 size-4"
                                checked={form.data.medical_consent}
                                onChange={(e) => form.setData('medical_consent', e.target.checked)}
                            />
                            <span>
                                <span className="block text-sm font-medium">{t('medical_consent')}</span>
                                <span className="block text-[11px] text-muted-foreground">
                                    {t('medical_consent_hint')}
                                </span>
                            </span>
                        </label>

                        <div className="flex gap-2">
                            <Button
                                onClick={submit}
                                disabled={form.processing}
                                className="h-11 flex-1 rounded-xl font-semibold"
                            >
                                {form.processing ? t('saving') : t('save')}
                            </Button>
                            <Button
                                variant="outline"
                                className="h-11 rounded-xl"
                                onClick={() => {
                                    setOpen(false);
                                    form.reset();
                                }}
                            >
                                {t('cancel')}
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
