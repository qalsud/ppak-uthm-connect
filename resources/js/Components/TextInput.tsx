import { forwardRef, InputHTMLAttributes, useEffect, useRef } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & { isFocused?: boolean };

export default forwardRef<HTMLInputElement, Props>(function TextInput(
    { type = 'text', className = '', isFocused = false, ...props },
    ref,
) {
    const input = (ref as React.RefObject<HTMLInputElement>) ?? useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isFocused) {
            input.current?.focus();
        }
    }, [isFocused, input]);

    return (
        <input
            {...props}
            type={type}
            className={
                'flex h-10 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ' +
                className
            }
            ref={input}
        />
    );
});