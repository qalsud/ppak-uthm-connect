import { useForm } from '@inertiajs/react';
import { useState } from 'react';

import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/table';
import { Textarea } from '@/Components/ui/textarea';
import { useI18n } from '@/lib/i18n';
import { teacherNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Student = { id: number; name: string; class: string };
type FieldMap = Record<string, string>;

export default function Activities({
    students,
    today,
    fields,
    records,
}: {
    students: Student[];
    today: string;
    fields: FieldMap;
    records: Array<{
        id: number;
        date: string;
        treatment_notes: string | null;
        student: { id: number; name: string; class: string };
    }>;
}) {
    const { t } = useI18n();
    const [dates, setDates] = useState<Record<string, string>>({});

    const form = useForm({
        student_id: '',
        date: today,
        treatment_notes: '',
        statuses: Object.fromEntries(Object.keys(fields).map((k) => [k, 'no'])) as Record<string, 'yes' | 'no'>,
    });

    const toggle = (field: string) => {
        form.setData('statuses', {
            ...form.data.statuses,
            [field]: form.data.statuses[field] === 'yes' ? 'no' : 'yes',
        });
    };

    const submit = () => {
        form.post(route('teacher.activities.store'));
    };

    const setStudent = (id: string) => {
        form.setData('student_id', id);
        setDates((prev) => ({ ...prev, [id]: today }));
    };

    return (
        <AppShell nav={teacherNav} title={t('teacher')}>
            <h1 className="mb-6 text-2xl font-bold">{t('daily_activities')}</h1>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>{t('record_new')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                            <Label>{t('student')}</Label>
                            <Select value={form.data.student_id} onValueChange={setStudent}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('select_student')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {students.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>
                                            {s.name} · {s.class}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.errors.student_id && (
                                <p className="text-xs text-destructive">{form.errors.student_id}</p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <Label>{t('date')}</Label>
                            <Input
                                type="date"
                                value={form.data.date}
                                max={today}
                                onChange={(e) => form.setData('date', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {Object.entries(fields).map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => toggle(key)}
                                className={`rounded-lg border p-2 text-left text-sm transition-colors ${
                                    form.data.statuses[key] === 'yes'
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                        : 'border-border bg-card hover:bg-accent'
                                }`}
                            >
                                {label}
                                <Badge
                                    variant={form.data.statuses[key] === 'yes' ? 'default' : 'secondary'}
                                    className={`mt-1 ${form.data.statuses[key] === 'yes' ? 'bg-emerald-600' : ''}`}
                                >
                                    {form.data.statuses[key] === 'yes' ? 'Yes' : 'No'}
                                </Badge>
                            </button>
                        ))}
                    </div>

                    <div className="space-y-1">
                        <Label>Treatment / {t('notes')}</Label>
                        <Textarea
                            rows={2}
                            value={form.data.treatment_notes}
                            onChange={(e) => form.setData('treatment_notes', e.target.value)}
                        />
                    </div>

                    <Button onClick={submit} disabled={form.processing}>
                        {t('save')}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t('recent_records')}</CardTitle>
                </CardHeader>
                <CardContent>
                    {records.length === 0 ? (
                        <p className="py-8 text-center text-muted-foreground">{t('no_data')}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('date')}</TableHead>
                                    <TableHead>{t('student')}</TableHead>
                                    <TableHead>{t('class')}</TableHead>
                                    <TableHead>{t('notes')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {records.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell>{r.date}</TableCell>
                                        <TableCell className="font-medium">{r.student.name}</TableCell>
                                        <TableCell>{r.student.class}</TableCell>
                                        <TableCell>{r.treatment_notes ?? '—'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </AppShell>
    );
}