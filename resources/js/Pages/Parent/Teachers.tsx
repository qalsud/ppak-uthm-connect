import { Mail, Phone, Users } from 'lucide-react';

import EmptyState from '@/Components/empty-state';
import PageHeader from '@/Components/page-header';
import { Avatar, AvatarFallback } from '@/Components/ui/avatar';
import { Card, CardContent } from '@/Components/ui/card';
import { useI18n } from '@/lib/i18n';
import { parentBottomNav, parentNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Teacher = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
};

const initials = (name: string) =>
    name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export default function ParentTeachers({ teachers }: { teachers: Teacher[] }) {
    const { t } = useI18n();

    return (
        <AppShell nav={parentNav} bottomNav={parentBottomNav} title={t('parent')}>
            <PageHeader title={t('teachers')} description="Contact your child's teachers" />

            {teachers.length === 0 ? (
                <Card className="rounded-2xl border-0 shadow-sm">
                    <EmptyState icon={Users} title="No teachers available yet" />
                </Card>
            ) : (
                <div className="space-y-3">
                    {teachers.map((teacher) => (
                        <Card key={teacher.id} className="rounded-2xl border-0 shadow-sm">
                            <CardContent className="flex items-center gap-3 pt-5">
                                <Avatar className="size-12">
                                    <AvatarFallback className="bg-accent text-accent-foreground">
                                        {initials(teacher.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold">{teacher.name}</p>
                                    <a
                                        href={`mailto:${teacher.email}`}
                                        className="flex items-center gap-1.5 truncate text-xs text-muted-foreground"
                                    >
                                        <Mail className="size-3.5" />
                                        {teacher.email}
                                    </a>
                                    {teacher.phone && (
                                        <a
                                            href={`tel:${teacher.phone}`}
                                            className="flex items-center gap-1.5 text-xs text-muted-foreground"
                                        >
                                            <Phone className="size-3.5" />
                                            {teacher.phone}
                                        </a>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </AppShell>
    );
}