import MemoList from '@/Components/memo-list';
import { useI18n } from '@/lib/i18n';
import PageHeader from '@/Components/page-header';
import { parentBottomNav, parentNav } from '@/lib/navigation';
import AppShell from '@/Layouts/app-shell';

type Memo = {
    id: number;
    title: string;
    description: string;
    created_at: string;
    author: { name: string } | null;
};

export default function ParentMemos({ memos }: { memos: Memo[] }) {
    const { t } = useI18n();

    return (
        <AppShell nav={parentNav} bottomNav={parentBottomNav} title={t('parent')}>
            <PageHeader title={t('memos')} description="Announcements from PPAK UTHM" />
            <MemoList memos={memos} emptyLabel={t('no_data')} />
        </AppShell>
    );
}