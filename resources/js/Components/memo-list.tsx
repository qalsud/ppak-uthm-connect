import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { formatDate } from '@/lib/date';

type Memo = {
    id: number;
    title: string;
    description: string;
    created_at: string;
    author: { name: string } | null;
};

export default function MemoList({ memos, emptyLabel }: { memos: Memo[]; emptyLabel: string }) {
    return (
        <div className="space-y-4">
            {memos.length === 0 ? (
                <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">
                        {emptyLabel}
                    </CardContent>
                </Card>
            ) : (
                memos.map((memo) => (
                    <Card key={memo.id}>
                        <CardHeader className="pb-3">
                            <CardTitle>{memo.title}</CardTitle>
                            <CardDescription>
                                {memo.author?.name} · {formatDate(memo.created_at)}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="whitespace-pre-wrap text-sm">{memo.description}</p>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    );
}