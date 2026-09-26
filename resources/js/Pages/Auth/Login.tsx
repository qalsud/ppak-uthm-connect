import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowRight, Lock, Mail } from 'lucide-react';import { FormEventHandler } from 'react';

import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Logo from '@/Components/logo';
import TextInput from '@/Components/TextInput';
import { Button } from '@/Components/ui/button';
import GuestLayout from '@/Layouts/GuestLayout';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Log in" />

            {/* Logos */}
            <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
                <Logo chip className="size-14" />
                <Logo variant="uthm" chip className="h-14 w-44" />
            </div>

            {/* Heading */}
            <div className="mb-7 text-center">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Welcome back
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Sign in to your PPAK UTHM account
                </p>
            </div>

            {status && (
                <div className="mb-5 rounded-lg bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-5">
                <div>
                    <InputLabel htmlFor="email" value="Email" />
                    <div className="relative mt-1.5">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <TextInput
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="block h-11 w-full pl-10"
                            autoComplete="username"
                            isFocused={true}
                            placeholder="you@example.com"
                            onChange={(e) => setData('email', e.target.value)}
                        />
                    </div>
                    <InputError message={errors.email} className="mt-1.5" />
                </div>

                <div>
                    <div className="flex items-center justify-between">
                        <InputLabel htmlFor="password" value="Password" />
                        {canResetPassword && (
                            <Link
                                href={route('password.request')}
                                className="text-xs font-medium text-primary hover:underline"
                            >
                                Forgot password?
                            </Link>
                        )}
                    </div>
                    <div className="relative mt-1.5">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="block h-11 w-full pl-10"
                            autoComplete="current-password"
                            placeholder="••••••••"
                            onChange={(e) => setData('password', e.target.value)}
                        />
                    </div>
                    <InputError message={errors.password} className="mt-1.5" />
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                        name="remember"
                        checked={data.remember}
                        onChange={(e) =>
                            setData('remember', (e.target.checked || false) as false)
                        }
                    />
                    Remember me
                </label>

                <Button
                    type="submit"
                    disabled={processing}
                    className="h-11 w-full rounded-xl text-sm font-semibold"
                >
                    {processing ? 'Signing in…' : 'Log in'}
                    {!processing && <ArrowRight className="ml-2 size-4" />}
                </Button>
            </form>

            {/* Divider + register */}
            <div className="relative my-6">
                <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
                <div className="relative flex justify-center">
                    <span className="bg-background px-3 text-xs text-muted-foreground">
                        New to PPAK UTHM?
                    </span>
                </div>
            </div>

            <Link href={route('register')}>
                <Button
                    variant="outline"
                    className="h-11 w-full rounded-xl text-sm font-semibold"
                >
                    Create a parent account
                </Button>
            </Link>

            <p className="mt-6 text-center text-xs text-muted-foreground">
                Need help? Contact{' '}
                <a href="mailto:ppak@uthm.edu.my" className="text-primary hover:underline">
                    ppak@uthm.edu.my
                </a>
            </p>
        </GuestLayout>
    );
}