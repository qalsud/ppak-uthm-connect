import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowRight, Lock, Mail, User } from 'lucide-react';
import { FormEventHandler } from 'react';

import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import BrandLockup from '@/Components/brand-lockup';
import TextInput from '@/Components/TextInput';
import { Button } from '@/Components/ui/button';
import { useI18n } from '@/lib/i18n';
import GuestLayout from '@/Layouts/GuestLayout';

export default function Register() {
    const { t } = useI18n();
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title={t('register')} />

            {/* Brand lockup (mobile — desktop shows it in the brand panel) */}
            <div className="mb-8 flex justify-center lg:hidden">
                <BrandLockup />
            </div>

            {/* Heading */}
            <div className="mb-7 text-center">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    {t('register_title')}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t('register_subtitle')}
                </p>
            </div>

            <form onSubmit={submit} className="space-y-5">
                <div>
                    <InputLabel htmlFor="name" value={t('full_name')} />
                    <div className="relative mt-1.5">
                        <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <TextInput
                            id="name"
                            name="name"
                            value={data.name}
                            className="block h-11 w-full pl-10"
                            autoComplete="name"
                            isFocused={true}
                            placeholder={t('full_name_placeholder')}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                        />
                    </div>
                    <InputError message={errors.name} className="mt-1.5" />
                </div>

                <div>
                    <InputLabel htmlFor="email" value={t('email')} />
                    <div className="relative mt-1.5">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="block h-11 w-full pl-10"
                            autoComplete="username"
                            placeholder="you@example.com"
                            onChange={(e) => setData('email', e.target.value)}
                            required
                        />
                    </div>
                    <InputError message={errors.email} className="mt-1.5" />
                </div>

                <div>
                    <InputLabel htmlFor="password" value={t('password')} />
                    <div className="relative mt-1.5">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="block h-11 w-full pl-10"
                            autoComplete="new-password"
                            placeholder="••••••••"
                            onChange={(e) => setData('password', e.target.value)}
                            required
                        />
                    </div>
                    <InputError message={errors.password} className="mt-1.5" />
                </div>

                <div>
                    <InputLabel htmlFor="password_confirmation" value={t('confirm_password')} />
                    <div className="relative mt-1.5">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <TextInput
                            id="password_confirmation"
                            type="password"
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className="block h-11 w-full pl-10"
                            autoComplete="new-password"
                            placeholder="••••••••"
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            required
                        />
                    </div>
                    <InputError message={errors.password_confirmation} className="mt-1.5" />
                </div>

                <Button
                    type="submit"
                    disabled={processing}
                    className="h-11 w-full rounded-xl text-sm font-semibold"
                >
                    {processing ? t('creating_account') : t('create_account')}
                    {!processing && <ArrowRight className="ml-2 size-4" />}
                </Button>
            </form>

            {/* Divider + login */}
            <div className="relative my-6">
                <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
                <div className="relative flex justify-center">
                    <span className="bg-background px-3 text-xs text-muted-foreground">
                        {t('already_have_account')}
                    </span>
                </div>
            </div>

            <Link href={route('login')}>
                <Button variant="outline" className="h-11 w-full rounded-xl text-sm font-semibold">
                    {t('back_to_login')}
                </Button>
            </Link>

            <p className="mt-6 text-center text-xs text-muted-foreground">
                {t('need_help_contact')}{' '}
                <a href="mailto:ppak@uthm.edu.my" className="text-primary hover:underline">
                    ppak@uthm.edu.my
                </a>
            </p>
        </GuestLayout>
    );
}