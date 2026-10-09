import MemoPhotos from '@/Components/memo-photos';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { formatDate } from '@/lib/date';
import type { PhotoInfo } from '@/lib/photo';

type Memo = {
    id: number;
    title: string;
    description: string;
    created_at: string;
    author: { name: string } | null;
    photos?: PhotoInfo[];
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
                            <MemoPhotos photos={memo.photos ?? []} />
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    );
}