import PrimaryButton from '@/Components/PrimaryButton';
import { useI18n } from '@/lib/i18n';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function VerifyEmail({ status }: { status?: string }) {
    const { t } = useI18n();
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title={t('verify_email')} />

            <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
                {t('verify_email')}
            </h1>

            <div className="mb-4 text-sm text-muted-foreground">
                {t('verify_email_desc')}
            </div>

            {status === 'verification-link-sent' && (
                <div className="mb-4 text-sm font-medium text-green-600">
                    {t('verification_link_sent')}
                </div>
            )}

            <form onSubmit={submit}>
                <div className="mt-4 flex items-center justify-between">
                    <PrimaryButton disabled={processing}>
                        {t('resend_verification_email')}
                    </PrimaryButton>

                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="rounded-md text-sm text-muted-foreground underline hover:text-foreground focus:outline-none"
                    >
                        {t('logout')}
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}
