import { useForm } from '@inertiajs/react';
import { Download, FileUp } from 'lucide-react';
import { useRef, useState } from 'react';

import FormDialog from '@/Components/form-dialog';
import { Button } from '@/Components/ui/button';
import { useI18n } from '@/lib/i18n';

/** Shared CSV import dialog with a client-side template download. */
export default function CsvImportDialog({
    open,
    onOpenChange,
    action,
    hint,
    templateColumns,
    templateName = 'template.csv',
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    action: string;
    hint: string;
    templateColumns: string[];
    templateName?: string;
}) {
    const { t } = useI18n();
    const form = useForm<{ file: File | null }>({ file: null });
    const inputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState('');

    const submit = () => {
        form.post(action, {
            forceFormData: true,
            onSuccess: () => {
                form.reset();
                setFileName('');
                if (inputRef.current) {
                    inputRef.current.value = '';
                }
                onOpenChange(false);
            },
        });
    };

    const downloadTemplate = () => {
        const blob = new Blob([`${templateColumns.join(',')}\n`], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = templateName;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <FormDialog
            open={open}
            onOpenChange={onOpenChange}
            title={t('import_csv')}
            onSubmit={submit}
            submitLabel={form.processing ? t('importing') : t('import')}
            processing={form.processing}
            submitDisabled={!form.data.file}
            maxWidth="max-w-md"
        >
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-6 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <FileUp className="size-5" />
                </span>
                <p className="text-xs text-muted-foreground">{hint}</p>
                <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="block w-full max-w-xs cursor-pointer rounded-md border border-input text-sm file:mr-3 file:rounded-none file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm"
                    onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        form.setData('file', file);
                        setFileName(file?.name ?? '');
                    }}
                />
                {fileName && <p className="text-xs font-medium">{fileName}</p>}
                {form.errors.file && <p className="text-xs text-destructive">{form.errors.file}</p>}
                <Button type="button" variant="link" size="sm" className="gap-1" onClick={downloadTemplate}>
                    <Download className="size-3.5" />
                    {t('download_template')}
                </Button>
            </div>
        </FormDialog>
    );
}
