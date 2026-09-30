import { router, useForm, usePage } from '@inertiajs/react';
import { Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';

import PageHeader from '@/Components/page-header';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { useI18n } from '@/lib/i18n';
import { adminBottomNav, adminNav } from '@/lib/navigation';
import type { PageProps } from '@/types';
import AppShell from '@/Layouts/app-shell';

type Option = {
    id: number | null;
    value: string;
    label: string;
    sort: number;
    is_active: boolean;
    in_use: boolean;
};

type Group = {
    group: string;
    label: string;
    customised: boolean;
    /** Keys map to real DB columns — options can be edited but not added. */
    fixed: boolean;
    options: Option[];
};

type Page = PageProps<{ groups: Group[] }>;

/** Editable option row — saves on blur when the label or sort changes. */
function OptionRow({ option, group }: { option: Option; group: string }) {
    const { t } = useI18n();
    const [label, setLabel] = useState(option.label);
    const [sort, setSort] = useState(String(option.sort));

    const dirty = label !== option.label || sort !== String(option.sort);

    const save = () => {
        if (!dirty) {
            return;
        }

        // Options that only exist as defaults are created on first save.
        if (option.id === null) {
            router.post(
                route('admin.lists.store'),
                { group, key: option.value, label, sort: Number(sort) || 0 },
                { preserveScroll: true },
            );

            return;
        }

        router.put(
            route('admin.lists.update', { option: option.id }),
            { label, sort: Number(sort) || 0, is_active: option.is_active },
            { preserveScroll: true },
        );
    };

    const toggleActive = () => {
        if (option.id === null) {
            router.post(
                route('admin.lists.store'),
                { group, key: option.value, label, sort: Number(sort) || 0, is_active: false },
                { preserveScroll: true },
            );

            return;
        }

        router.put(
            route('admin.lists.update', { option: option.id }),
            { label, sort: Number(sort) || 0, is_active: !option.is_active },
            { preserveScroll: true },
        );
    };

    const remove = () => {
        if (option.id === null) {
            return;
        }

        router.delete(route('admin.lists.destroy', { option: option.id }), { preserveScroll: true });
    };

    return (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2">
            <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={save}
                className="h-9 flex-1 basis-40"
            />
            <Input
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                onBlur={save}
                type="number"
                min={0}
                className="h-9 w-16"
                aria-label={t('sort_order')}
            />
            <span className="rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
                {option.value}
            </span>

            {option.in_use && (
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {t('in_use')}
                </Badge>
            )}

            {!option.is_active && (
                <Badge variant="outline" className="shrink-0 text-[10px]">
                    {t('inactive')}
                </Badge>
            )}

            <div className="ml-auto flex shrink-0 items-center gap-1">
                {dirty && (
                    <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={save}>
                        <Save className="size-3.5" />
                        {t('save')}
                    </Button>
                )}
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={toggleActive}
                    title={option.is_active ? t('deactivate') : t('activate')}
                >
                    {option.is_active ? <Trash2 className="size-3.5" /> : <RotateCcw className="size-3.5" />}
                </Button>
            </div>
        </div>
    );
}

export default function AdminLists() {
    const { t } = useI18n();
    const { props } = usePage<Page>();
    const { groups } = props;
    const [activeGroup, setActiveGroup] = useState(groups[0]?.group ?? '');
    const [adding, setAdding] = useState(false);

    const addForm = useForm({ group: activeGroup, key: '', label: '', sort: '0' });

    const current = groups.find((g) => g.group === activeGroup);

    const add = () =>
        addForm.post(route('admin.lists.store'), {
            preserveScroll: true,
            onSuccess: () => {
                addForm.reset('key', 'label');
                setAdding(false);
            },
        });

    return (
        <AppShell nav={adminNav} bottomNav={adminBottomNav} title={t('admin')}>
            <PageHeader title={t('lists')} description={t('lists_desc')} />

            <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
                {/* Group picker */}
                <Card className="h-fit rounded-2xl border-0 shadow-sm">
                    <CardContent className="p-2">
                        <nav className="space-y-0.5">
                            {groups.map((g) => (
                                <button
                                    key={g.group}
                                    type="button"
                                    onClick={() => {
                                        setActiveGroup(g.group);
                                        setAdding(false);
                                        addForm.setData('group', g.group);
                                    }}
                                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                                        g.group === activeGroup
                                            ? 'bg-primary text-primary-foreground'
                                            : 'hover:bg-accent'
                                    }`}
                                >
                                    <span className="truncate">{t(`list.${g.group}`, g.label)}</span>
                                    <span className="shrink-0 text-[10px] opacity-70">{g.options.length}</span>
                                </button>
                            ))}
                        </nav>
                    </CardContent>
                </Card>

                {/* Options */}
                <Card className="rounded-2xl border-0 shadow-sm">
                    <CardHeader className="flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base">
                            {t(`list.${activeGroup}`, activeGroup)}
                            {current && !current.customised && (
                                <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                                    {t('list_using_defaults')}
                                </span>
                            )}
                        </CardTitle>
                        {!current?.fixed && (
                            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAdding(true)}>
                                <Plus className="size-3.5" />
                                {t('add_option')}
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {adding && (
                            <div className="flex flex-wrap items-end gap-2 rounded-xl border-2 border-primary/30 p-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium">{t('value')}</label>
                                    <Input
                                        value={addForm.data.key}
                                        onChange={(e) => addForm.setData('key', e.target.value)}
                                        placeholder="theki"
                                        className="h-9 w-32 font-mono text-xs"
                                    />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <label className="text-xs font-medium">{t('label')}</label>
                                    <Input
                                        value={addForm.data.label}
                                        onChange={(e) => addForm.setData('label', e.target.value)}
                                        className="h-9"
                                    />
                                </div>
                                <Button size="sm" className="h-9" onClick={add} disabled={addForm.processing}>
                                    {t('add')}
                                </Button>
                                <Button size="sm" variant="outline" className="h-9" onClick={() => setAdding(false)}>
                                    {t('cancel')}
                                </Button>
                                {addForm.errors.key && (
                                    <p className="w-full text-xs text-destructive">{addForm.errors.key}</p>
                                )}
                            </div>
                        )}

                        {current?.options.length === 0 && (
                            <p className="py-6 text-center text-sm text-muted-foreground">{t('no_data')}</p>
                        )}

                        {current?.options.map((o) => (
                            <OptionRow key={o.value} option={o} group={activeGroup} />
                        ))}

                        <p className="pt-2 text-[11px] text-muted-foreground">{t('lists_hint')}</p>
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    );
}
