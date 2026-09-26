import { useForm } from '@inertiajs/react';

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
import PageHeader from '@/Components/page-header';
import { teacherNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Student = { id: number; name: string; class: string };

export default function Progress({
    students,
    records,
    permata,
    free,
    development,
    grades,
}: {
    students: Student[];
    records: Array<{
        id: number;
        date: string;
        sub_theme: string | null;
        activity_done: string;
        development_proficiency: string;
        student: { name: string };
    }>;
    permata: string[];
    free: string[];
    development: string[];
    grades: string[];
}) {
    const { t } = useI18n();

    const form = useForm({
        student_id: '',
        date: new Date().toISOString().slice(0, 10),
        sub_theme: '',
        activity_done: 'Select',
        child_proficiency: 'Select',
        permata_activity: 'Select',
        free_activity: 'Select',
        development_proficiency: 'Select',
        notes: '',
    });

    const submit = () => {
        form.post(route('teacher.progress.store'));
    };

    const field = (label: string, name: keyof typeof form.data, options: string[]) => (
        <div className="space-y-1">
            <Label>{label}</Label>
            <Select
                value={String(form.data[name])}
                onValueChange={(v) => form.setData(name, v as never)}
            >
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Select">—</SelectItem>
                    {options.map((o) => (
                        <SelectItem key={o} value={o}>
                            {o}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );

    return (
        <AppShell nav={teacherNav} title={t('teacher')}>
            <PageHeader title={t('progress')} description="Record each child's learning progress" />

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>{t('record_progress')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                            <Label>{t('student')}</Label>
                            <Select
                                value={form.data.student_id}
                                onValueChange={(v) => form.setData('student_id', v)}
                            >
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
                        </div>
                        <div className="space-y-1">
                            <Label>{t('date')}</Label>
                            <Input
                                type="date"
                                value={form.data.date}
                                onChange={(e) => form.setData('date', e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Sub-theme</Label>
                            <Input
                                value={form.data.sub_theme}
                                onChange={(e) => form.setData('sub_theme', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                        {field('Activity Performance', 'activity_done', grades)}
                        {field('Child Proficiency', 'child_proficiency', grades)}
                        {field('PERMATA Activity', 'permata_activity', permata)}
                        {field('Free Activity', 'free_activity', free)}
                        {field('Development', 'development_proficiency', development)}
                    </div>

                    <div className="space-y-1">
                        <Label>{t('notes')}</Label>
                        <Textarea
                            rows={2}
                            value={form.data.notes}
                            onChange={(e) => form.setData('notes', e.target.value)}
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
                                    <TableHead>Sub-theme</TableHead>
                                    <TableHead>Activity</TableHead>
                                    <TableHead>Development</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {records.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell>{r.date}</TableCell>
                                        <TableCell className="font-medium">{r.student.name}</TableCell>
                                        <TableCell>{r.sub_theme ?? '—'}</TableCell>
                                        <TableCell>{r.activity_done}</TableCell>
                                        <TableCell>{r.development_proficiency}</TableCell>
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