import MemoList from '@/Components/memo-list';
import { useI18n } from '@/lib/i18n';
import { teacherNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Memo = {
    id: number;
    title: string;
    description: string;
    created_at: string;
    author: { name: string } | null;
};

export default function TeacherMemos({ memos }: { memos: Memo[] }) {
    const { t } = useI18n();

    return (
        <AppShell nav={teacherNav} title={t('teacher')}>
            <h1 className="mb-6 text-2xl font-bold">{t('memos')}</h1>
            <MemoList memos={memos} emptyLabel={t('no_data')} />
        </AppShell>
    );
}