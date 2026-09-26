import { router } from '@inertiajs/react';
import { Bell, CheckCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/Components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { Separator } from '@/Components/ui/separator';

type Item = {
    id: string;
    read_at: string | null;
    created_at: string;
    data: { title?: string; body?: string; url?: string };
};

/**
 * In-app notification bell. Polls the /notifications endpoint — functional on
 * its own and becomes live/instant when Pusher keys are configured server-side.
 */
export default function NotificationBell() {
    const [items, setItems] = useState<Item[]>([]);
    const [count, setCount] = useState(0);

    const load = useCallback(async () => {
        try {
            const { data } = await window.axios.get('/notifications');
            setCount(data.count ?? 0);
            setItems(data.data ?? []);
        } catch {
            // ignore transient errors
        }
    }, []);

    useEffect(() => {
        load();
        const interval = setInterval(load, 15000);

        return () => clearInterval(interval);
    }, [load]);

    const open = async (item: Item) => {
        try {
            await window.axios.post('/notifications/read-all');
        } catch {
            // ignore
        }
        setCount(0);
        if (item.data.url) {
            router.visit(item.data.url);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="size-5" />
                    {count > 0 && (
                        <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                            {count > 9 ? '9+' : count}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-3 py-2">
                    <p className="text-sm font-semibold">Notifications</p>
                    {count > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => {
                                window.axios.post('/notifications/read-all');
                                setCount(0);
                            }}
                        >
                            <CheckCheck className="size-3" />
                            Mark all read
                        </Button>
                    )}
                </div>
                <Separator />
                {items.length === 0 ? (
                    <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                        No notifications
                    </p>
                ) : (
                    <div className="max-h-80 overflow-y-auto">
                        {items.map((item) => (
                            <DropdownMenuItem
                                key={item.id}
                                onClick={() => open(item)}
                                className="cursor-pointer items-start gap-2 px-3 py-2"
                            >
                                <span
                                    className={`mt-1 size-2 shrink-0 rounded-full ${item.read_at ? 'bg-muted' : 'bg-brand-blue'}`}
                                />
                                <span className="min-w-0">
                                    <span className="block text-sm font-medium">
                                        {item.data.title}
                                    </span>
                                    <span className="block truncate text-xs text-muted-foreground">
                                        {item.data.body}
                                    </span>
                                    <span className="block text-[11px] text-muted-foreground/70">
                                        {new Date(item.created_at).toLocaleString()}
                                    </span>
                                </span>
                            </DropdownMenuItem>
                        ))}
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}