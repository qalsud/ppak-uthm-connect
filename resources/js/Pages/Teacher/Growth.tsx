import { router, useForm } from '@inertiajs/react';
import { Ruler } from 'lucide-react';

import PageHeader from '@/Components/page-header';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/table';
import { localDate } from '@/lib/date';
import { useI18n } from '@/lib/i18n';
import { actionRoute, actionUrl, shellFor } from '@/lib/shell';
import AppShell from '@/Layouts/app-shell';

type Student = { id: number; name: string; class: string };

type Record = {
    id: number;
    date: string;
    student: string | null;
    height_cm: number | null;
    weight_kg: number | null;
    bmi: number | null;
    notes: string | null;
    recorded_by: string | null;
};

const classLabel = (c: string) => (c === '5tahun' ? '5 Tahun' : c === '6bintang' ? '6 Bintang' : c);

export default function TeacherGrowth({
    students,
    records,
    latest,
    averageBmi,
    selectedClass,
    assignedClass,
    shellProp,
}: {
    shellProp?: string;
    students: Student[];
    records: Record[];
    latest: Record[];
    averageBmi: number | null;
    selectedClass: string | null;
    assignedClass?: string | null;
}) {
    const { t } = useI18n();
    const shell = shellFor(shellProp);

    const reload = (params: { class?: string }) =>
        router.get(
            actionUrl(shell.isAdmin, 'growth'),
            { class: params.class ?? selectedClass ?? '' },
            { preserveState: true, preserveScroll: true },
        );

    const form = useForm({
        student_id: '',
        date: localDate(),
        height_cm: '',
        weight_kg: '',
        notes: '',
    });

    const submit = () =>
        form.post(actionRoute(shell.isAdmin, 'growth.store'), {
            preserveScroll: true,
            onSuccess: () => form.reset('height_cm', 'weight_kg', 'notes'),
        });

    return (
        <AppShell nav={shell.nav} bottomNav={shell.bottomNav} title={t(shell.title)}>
            <PageHeader title={t('growth')} description={t('bmi_note')}>
                {assignedClass ? (
                    <span className="text-sm text-muted-foreground">{classLabel(assignedClass)}</span>
                ) : (
                    <div className="w-40">
                        <Select value={selectedClass ?? undefined} onValueChange={(v) => reload({ class: v })}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('class')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">{t('all')}</SelectItem>
                                <SelectItem value="5tahun">5 Tahun</SelectItem>
                                <SelectItem value="6bintang">6 Bintang</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </PageHeader>

            {/* Record a measurement */}
            <Card className="mb-4 rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Ruler className="size-4 text-primary" />
                        {t('record_growth')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <div className="space-y-1">
                            <Label>{t('child')}</Label>
                            <Select
                                value={form.data.student_id}
                                onValueChange={(v) => form.setData('student_id', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('child')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {students.map((s) => (
                                        <SelectItem key={s.id} value={s.id.toString()}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>{t('date')}</Label>
                            <Input
                                type="date"
                                max={localDate()}
                                value={form.data.date}
                                onChange={(e) => form.setData('date', e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>{t('height_cm')}</Label>
                            <Input
                                type="number"
                                step="0.1"
                                inputMode="decimal"
                                value={form.data.height_cm}
                                onChange={(e) => form.setData('height_cm', e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>{t('weight_kg')}</Label>
                            <Input
                                type="number"
                                step="0.1"
                                inputMode="decimal"
                                value={form.data.weight_kg}
                                onChange={(e) => form.setData('weight_kg', e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>{t('notes')}</Label>
                            <Input
                                value={form.data.notes}
                                onChange={(e) => form.setData('notes', e.target.value)}
                            />
                        </div>
                    </div>

                    {(form.errors.student_id || form.errors.height_cm || form.errors.weight_kg) && (
                        <p className="mt-2 text-xs text-destructive">
                            {form.errors.student_id ?? form.errors.height_cm ?? form.errors.weight_kg}
                        </p>
                    )}

                    <Button
                        onClick={submit}
                        disabled={form.processing || !form.data.student_id}
                        className="mt-3 h-10 rounded-xl"
                    >
                        {t('record_growth')}
                    </Button>
                </CardContent>
            </Card>

            {/* Class average + latest per child */}
            <Card className="mb-4 rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                        {t('latest_measurement')}
                        <span className="text-sm font-normal text-muted-foreground">
                            {t('average_bmi')}:{' '}
                            <span className="font-semibold text-foreground">{averageBmi ?? '—'}</span>
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {latest.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">{t('no_growth')}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('name')}</TableHead>
                                    <TableHead>{t('date')}</TableHead>
                                    <TableHead>{t('height_cm')}</TableHead>
                                    <TableHead>{t('weight_kg')}</TableHead>
                                    <TableHead>{t('bmi')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {latest.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell className="font-medium">{r.student}</TableCell>
                                        <TableCell className="text-muted-foreground">{r.date}</TableCell>
                                        <TableCell>{r.height_cm ?? '—'}</TableCell>
                                        <TableCell>{r.weight_kg ?? '—'}</TableCell>
                                        <TableCell className="font-semibold">{r.bmi ?? '—'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* History */}
            {records.length > 0 && (
                <Card className="rounded-2xl border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">{t('growth_history')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('date')}</TableHead>
                                    <TableHead>{t('name')}</TableHead>
                                    <TableHead>{t('height_cm')}</TableHead>
                                    <TableHead>{t('weight_kg')}</TableHead>
                                    <TableHead>{t('bmi')}</TableHead>
                                    <TableHead>{t('recorded_by')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {records.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell className="text-muted-foreground">{r.date}</TableCell>
                                        <TableCell className="font-medium">{r.student}</TableCell>
                                        <TableCell>{r.height_cm ?? '—'}</TableCell>
                                        <TableCell>{r.weight_kg ?? '—'}</TableCell>
                                        <TableCell className="font-semibold">{r.bmi ?? '—'}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {r.recorded_by ?? '—'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </AppShell>
    );
}
