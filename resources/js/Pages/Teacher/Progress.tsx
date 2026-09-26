import { useForm } from '@inertiajs/react';
import { BookOpen } from 'lucide-react';

import PageHeader from '@/Components/page-header';
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
import { Textarea } from '@/Components/ui/textarea';
import { useI18n } from '@/lib/i18n';
import { localDate } from '@/lib/date';
import { teacherBottomNav, teacherNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Student = { id: number; name: string; class: string };

const classLabel = (c: string) => (c === '5tahun' ? '5 Tahun' : c === '6bintang' ? '6 Bintang' : c);

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
        date: localDate(),
        sub_theme: '',
        activity_done: 'Select',
        child_proficiency: 'Select',
        permata_activity: 'Select',
        free_activity: 'Select',
        development_proficiency: 'Select',
        notes: '',
    });

    const submit = () => form.post(route('teacher.progress.store'));

    const field = (label: string, name: keyof typeof form.data, options: string[]) => (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Select
                value={String(form.data[name])}
                onValueChange={(v) => form.setData(name, v as never)}
            >
                <SelectTrigger className="h-11">
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
        <AppShell nav={teacherNav} bottomNav={teacherBottomNav} title={t('teacher')}>
            <PageHeader
                title={t('progress')}
                description="Record each child's learning progress"
            />

            <Card className="mb-4 rounded-2xl border-0 shadow-sm">
                <CardContent className="space-y-4 pt-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>{t('student')}</Label>
                            <Select
                                value={form.data.student_id}
                                onValueChange={(v) => form.setData('student_id', v)}
                            >
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder={t('select_student')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {students.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>
                                            {s.name} · {classLabel(s.class)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('date')}</Label>
                            <Input
                                type="date"
                                className="h-11"
                                max={localDate()}
                                value={form.data.date}
                                onChange={(e) => form.setData('date', e.target.value)}
                            />
                            {form.errors.date && (
                                <p className="text-xs text-destructive">{form.errors.date}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Sub-theme</Label>
                        <Input
                            className="h-11"
                            placeholder="Today's learning sub-theme"
                            value={form.data.sub_theme}
                            onChange={(e) => form.setData('sub_theme', e.target.value)}
                        />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        {field('Activity performance', 'activity_done', grades)}
                        {field('Child proficiency', 'child_proficiency', grades)}
                        {field('PERMATA activity', 'permata_activity', permata)}
                        {field('Free activity', 'free_activity', free)}
                        {field('Development', 'development_proficiency', development)}
                    </div>

                    <div className="space-y-2">
                        <Label>{t('notes')}</Label>
                        <Textarea
                            rows={2}
                            value={form.data.notes}
                            onChange={(e) => form.setData('notes', e.target.value)}
                        />
                    </div>

                    <Button
                        onClick={submit}
                        disabled={form.processing}
                        className="h-12 w-full rounded-xl font-semibold"
                    >
                        {form.processing ? 'Saving…' : t('save')}
                    </Button>
                </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <BookOpen className="size-4 text-primary" />
                        {t('recent_records')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {records.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            {t('no_data')}
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {records.map((r) => (
                                <div key={r.id} className="rounded-xl bg-muted/50 px-3 py-2.5">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium">{r.student.name}</p>
                                        <span className="text-xs text-muted-foreground">
                                            {r.date}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        {r.sub_theme ?? '—'} · {r.activity_done} ·{' '}
                                        {r.development_proficiency}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </AppShell>
    );
}