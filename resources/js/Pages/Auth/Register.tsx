import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowRight, Lock, Mail, User } from 'lucide-react';
import { FormEventHandler } from 'react';

import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Logo from '@/Components/logo';
import TextInput from '@/Components/TextInput';
import { Button } from '@/Components/ui/button';
import GuestLayout from '@/Layouts/GuestLayout';

export default function Register() {
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
            <Head title="Register" />

            {/* Logos */}
            <div className="mb-8 flex flex-wrap items-center justify-center gap-4">
                <Logo chip className="size-20" />
                <Logo variant="uthm" chip className="h-20 w-60" />
            </div>

            {/* Heading */}
            <div className="mb-7 text-center">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Create your account
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Register as a parent — an admin will approve your account
                </p>
            </div>

            <form onSubmit={submit} className="space-y-5">
                <div>
                    <InputLabel htmlFor="name" value="Full name" />
                    <div className="relative mt-1.5">
                        <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <TextInput
                            id="name"
                            name="name"
                            value={data.name}
                            className="block h-11 w-full pl-10"
                            autoComplete="name"
                            isFocused={true}
                            placeholder="Your full name"
                            onChange={(e) => setData('name', e.target.value)}
                            required
                        />
                    </div>
                    <InputError message={errors.name} className="mt-1.5" />
                </div>

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
                            placeholder="you@example.com"
                            onChange={(e) => setData('email', e.target.value)}
                            required
                        />
                    </div>
                    <InputError message={errors.email} className="mt-1.5" />
                </div>

                <div>
                    <InputLabel htmlFor="password" value="Password" />
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
                    <InputLabel htmlFor="password_confirmation" value="Confirm password" />
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
                    {processing ? 'Creating account…' : 'Create account'}
                    {!processing && <ArrowRight className="ml-2 size-4" />}
                </Button>
            </form>

            {/* Divider + login */}
            <div className="relative my-6">
                <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
                <div className="relative flex justify-center">
                    <span className="bg-background px-3 text-xs text-muted-foreground">
                        Already have an account?
                    </span>
                </div>
            </div>

            <Link href={route('login')}>
                <Button variant="outline" className="h-11 w-full rounded-xl text-sm font-semibold">
                    Back to login
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