import PhotoThumb from '@/Components/photo-thumb';
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
                            {memo.photos && memo.photos.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {memo.photos.map((photo) => (
                                        <PhotoThumb key={photo.id} photo={photo} size="size-24" />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    );
}