import { router, usePage } from '@inertiajs/react';
import { Building2, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';

import FormDialog from '@/Components/form-dialog';
import PageHeader from '@/Components/page-header';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { FormField, FormGrid } from '@/Components/ui/form-field';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { useI18n } from '@/lib/i18n';
import { adminBottomNav, adminNav } from '@/lib/navigation';
import { useForm } from '@inertiajs/react';
import type { PageProps } from '@/types';
import AppShell from '@/Layouts/app-shell';

type Centre = {
    id: number;
    name: string;
    short_name: string | null;
    code: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    is_active: boolean;
    students_count: number;
    users_count: number;
    sort: number;
};

type Page = PageProps<{ centres: Centre[]; activeId: number | null }>;

const emptyForm = {
    name: '',
    short_name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    sort: '0',
};

export default function AdminCentres() {
    const { t } = useI18n();
    const { props } = usePage<Page>();
    const { centres, activeId } = props;

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Centre | null>(null);

    const form = useForm({ ...emptyForm });

    const openCreate = () => {
        setEditing(null);
        form.setData({ ...emptyForm });
        form.clearErrors();
        setOpen(true);
    };

    const openEdit = (centre: Centre) => {
        setEditing(centre);
        form.setData({
            name: centre.name,
            short_name: centre.short_name ?? '',
            code: centre.code,
            address: centre.address ?? '',
            phone: centre.phone ?? '',
            email: centre.email ?? '',
            sort: String(centre.sort ?? 0),
        });
        form.clearErrors();
        setOpen(true);
    };

    const submit = () => {
        if (editing) {
            form.put(route('admin.centres.update', { centre: editing.id }), {
                preserveScroll: true,
                onSuccess: () => setOpen(false),
            });

            return;
        }

        form.post(route('admin.centres.store'), {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
        });
    };

    return (
        <AppShell nav={adminNav} bottomNav={adminBottomNav} title={t('admin')}>
            <PageHeader title={t('centres')} description={t('centres_desc')}>
                <Button onClick={openCreate} className="gap-1.5">
                    <Plus className="size-4" />
                    {t('add_centre')}
                </Button>
            </PageHeader>

            <div className="grid gap-3 sm:grid-cols-2">
                {centres.map((c) => (
                    <Card
                        key={c.id}
                        className={`rounded-2xl border-0 shadow-sm ${
                            activeId === c.id ? 'ring-2 ring-primary' : ''
                        }`}
                    >
                        <CardContent className="space-y-3 pt-5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white">
                                        <Building2 className="size-5" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold">{c.name}</p>
                                        <p className="font-mono text-[11px] text-muted-foreground">
                                            {c.code}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex shrink-0 gap-1.5">
                                    {activeId === c.id && (
                                        <Badge variant="secondary" className="text-[10px]">
                                            {t('active_centre')}
                                        </Badge>
                                    )}
                                    {!c.is_active && (
                                        <Badge variant="outline" className="text-[10px]">
                                            {t('inactive')}
                                        </Badge>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 gap-1 text-xs"
                                        onClick={() => openEdit(c)}
                                    >
                                        <Pencil className="size-3.5" />
                                        {t('edit')}
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-[11px] text-muted-foreground">{t('students')}</p>
                                    <p className="font-semibold">{c.students_count}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-muted-foreground">{t('staff')}</p>
                                    <p className="font-semibold">{c.users_count}</p>
                                </div>
                            </div>

                            {(c.phone || c.email) && (
                                <p className="text-[11px] text-muted-foreground">
                                    {[c.phone, c.email].filter(Boolean).join(' · ')}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <p className="mt-4 text-[11px] text-muted-foreground">{t('centres_hint')}</p>

            <FormDialog
                open={open}
                onOpenChange={setOpen}
                title={editing ? `${t('edit')} ${t('centre')}` : `${t('add')} ${t('centre')}`}
                onSubmit={submit}
                submitLabel={editing ? t('save') : t('add_centre')}
                processing={form.processing}
                maxWidth="max-w-xl"
            >
                <FormGrid>
                    <FormField label={t('name')} error={form.errors.name} className="sm:col-span-2">
                        <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                    </FormField>

                    <FormField label={t('short_name')} error={form.errors.short_name}>
                        <Input
                            value={form.data.short_name}
                            onChange={(e) => form.setData('short_name', e.target.value)}
                        />
                    </FormField>

                    <FormField
                        label={t('code')}
                        error={form.errors.code}
                        hint={t('code_hint')}
                    >
                        <Input
                            value={form.data.code}
                            onChange={(e) => form.setData('code', e.target.value)}
                            className="font-mono text-xs"
                        />
                    </FormField>

                    <FormField label={t('phone')} error={form.errors.phone}>
                        <Input value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} />
                    </FormField>

                    <FormField label={t('email')} error={form.errors.email}>
                        <Input
                            type="email"
                            value={form.data.email}
                            onChange={(e) => form.setData('email', e.target.value)}
                        />
                    </FormField>

                    <FormField label={t('address')} error={form.errors.address} className="sm:col-span-2">
                        <Textarea
                            rows={2}
                            value={form.data.address}
                            onChange={(e) => form.setData('address', e.target.value)}
                        />
                    </FormField>
                </FormGrid>
            </FormDialog>
        </AppShell>
    );
}
