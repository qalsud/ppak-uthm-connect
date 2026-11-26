import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { useI18n } from '@/lib/i18n';
import { categoryMeta, NOTIFICATION_CATEGORIES } from '@/lib/notification-meta';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { Mail } from 'lucide-react';
import { FormEventHandler } from 'react';

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    notificationDefaults,
    className = '',
}: {
    mustVerifyEmail: boolean;
    status?: string;
    notificationDefaults: Record<string, boolean>;
    className?: string;
}) {
    const { t } = useI18n();
    const user = usePage().props.auth.user;

    const savedPreferences = (
        user as { notification_preferences?: Record<string, boolean> | null }
    ).notification_preferences ?? {};

    const initialPreferences = Object.fromEntries(
        NOTIFICATION_CATEGORIES.map((category) => [
            category,
            typeof savedPreferences[category] === 'boolean'
                ? savedPreferences[category]
                : category === 'messages'
                  ? Boolean((user as { notify_email_messages?: boolean }).notify_email_messages)
                  : Boolean(notificationDefaults[category]),
        ]),
    );

    const { data, setData, patch, errors, processing, recentlySuccessful } =
        useForm({
            name: user.name,
            email: user.email,
            notify_email_messages: (user as { notify_email_messages?: boolean }).notify_email_messages ?? false,
            notification_preferences: initialPreferences,
        });

    const toggleEmail = (category: string, checked: boolean) => {
        setData({
            ...data,
            notification_preferences: {
                ...data.notification_preferences,
                [category]: checked,
            },
            ...(category === 'messages' ? { notify_email_messages: checked } : {}),
        });
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(route('profile.update'));
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-gray-900">
                    {t('profile_information')}
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                    {t('profile_information_desc')}
                </p>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-6">
                <div>
                    <InputLabel htmlFor="name" value={t('name')} />

                    <TextInput
                        id="name"
                        className="mt-1 block w-full"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        isFocused
                        autoComplete="name"
                    />

                    <InputError className="mt-2" message={errors.name} />
                </div>

                <div>
                    <InputLabel htmlFor="email" value={t('email')} />

                    <TextInput
                        id="email"
                        type="email"
                        className="mt-1 block w-full"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        autoComplete="username"
                    />

                    <InputError className="mt-2" message={errors.email} />
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div>
                        <p className="mt-2 text-sm text-gray-800">
                            {t('email_unverified')}
                            <Link
                                href={route('verification.send')}
                                method="post"
                                as="button"
                                className="rounded-md text-sm text-gray-600 underline hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                                {t('click_to_resend_verification')}
                            </Link>
                        </p>

                        {status === 'verification-link-sent' && (
                            <div className="mt-2 text-sm font-medium text-green-600">
                                {t('verification_link_sent')}
                            </div>
                        )}
                    </div>
                )}

                <div className="rounded-xl border p-4">
                    <div className="flex items-start gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                            <Mail className="size-4" aria-hidden="true" />
                        </span>
                        <div>
                            <p className="text-sm font-medium text-gray-900">
                                {t('notification_preferences')}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">
                                {t('notification_preferences_desc')}
                            </p>
                        </div>
                    </div>

                    <div className="mt-3 grid gap-1 sm:grid-cols-2">
                        {NOTIFICATION_CATEGORIES.map((category) => {
                            const meta = categoryMeta(category);

                            return (
                                <label
                                    key={category}
                                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-gray-50"
                                >
                                    <input
                                        type="checkbox"
                                        className="size-4 accent-primary"
                                        checked={data.notification_preferences[category] ?? false}
                                        onChange={(e) => toggleEmail(category, e.target.checked)}
                                    />
                                    <span className="text-sm text-gray-700">
                                        {t(meta.labelKey)}
                                    </span>
                                </label>
                            );
                        })}
                    </div>

                    <p className="mt-2 px-2 text-[11px] text-gray-500">
                        {t('notification_email_hint')}
                    </p>
                    <InputError className="mt-2" message={errors.notification_preferences} />
                </div>

                <div className="flex items-center gap-4">
                    <PrimaryButton disabled={processing}>{t('save')}</PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm text-gray-600">
                            {t('saved')}
                        </p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
