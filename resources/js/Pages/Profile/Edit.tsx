import { Head, usePage } from '@inertiajs/react';

import {
    adminBottomNav,
    adminNav,
    parentBottomNav,
    parentNav,
    teacherBottomNav,
    teacherNav,
} from '@/lib/navigation';
import { useI18n } from '@/lib/i18n';
import AppShell from '@/Layouts/app-shell';
import type { PageProps } from '@/types';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({
    mustVerifyEmail,
    status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
    const { t } = useI18n();
    const { auth } = usePage<PageProps>().props;
    const role = auth.user.role;

    const nav = role === 'admin' ? adminNav : role === 'teacher' ? teacherNav : parentNav;
    const bottomNav =
        role === 'admin' ? adminBottomNav : role === 'teacher' ? teacherBottomNav : parentBottomNav;

    return (
        <AppShell nav={nav} bottomNav={bottomNav} title={t('profile')}>
            <Head title={t('profile')} />

            <h1 className="mb-4 text-2xl font-bold text-foreground lg:hidden">{t('profile')}</h1>

            <div className="mx-auto max-w-4xl space-y-6">
                <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
                    <UpdateProfileInformationForm
                        mustVerifyEmail={mustVerifyEmail}
                        status={status}
                        className="max-w-xl"
                    />
                </div>

                <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
                    <UpdatePasswordForm className="max-w-xl" />
                </div>

                <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
                    <DeleteUserForm className="max-w-xl" />
                </div>
            </div>
        </AppShell>
    );
}
