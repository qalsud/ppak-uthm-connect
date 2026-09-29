import io

# ---------------------------------------------------------------- Parents
path = r"resources/js/Pages/Admin/Parents.tsx"
with io.open(path, encoding="utf-8") as fh:
    lines = fh.readlines()

start, end = 306, 396  # 1-indexed 307..396
assert lines[start].strip().startswith("<Dialog open={open}"), lines[start]
assert lines[end - 1].strip() == "</Dialog>", lines[end - 1]

new_block = '''            <FormDialog
                open={open}
                onOpenChange={setOpen}
                title={editing ? `${t('edit')} ${t('parent')}` : `${t('add')} ${t('parent')}`}
                onSubmit={submit}
                submitLabel={editing ? t('save') : `${t('add')} ${t('parent')}`}
                processing={form.processing}
            >
                <FormGrid>
                    <FormField label={t('name')} error={form.errors.name}>
                        <Input
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                        />
                    </FormField>

                    <FormField label={t('ic')}>
                        <Input
                            value={form.data.ic_number}
                            onChange={(e) => form.setData('ic_number', e.target.value)}
                        />
                    </FormField>

                    <FormField label={t('email')} error={form.errors.email}>
                        <Input
                            type="email"
                            value={form.data.email}
                            onChange={(e) => form.setData('email', e.target.value)}
                        />
                    </FormField>

                    <FormField label={t('phone')}>
                        <Input
                            value={form.data.phone}
                            onChange={(e) => form.setData('phone', e.target.value)}
                        />
                    </FormField>

                    <FormField
                        label={t('password')}
                        error={form.errors.password}
                        hint={editing ? t('leave_blank_password') : undefined}
                        className="sm:col-span-2"
                    >
                        <Input
                            type="password"
                            value={form.data.password}
                            onChange={(e) => form.setData('password', e.target.value)}
                        />
                    </FormField>

                    {editing && (
                        <FormField label={t('status')} className="sm:col-span-2">
                            <Select value={form.data.status} onValueChange={(v) => form.setData('status', v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {t(s)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>
                    )}
                </FormGrid>
            </FormDialog>
'''

lines[start:end] = [new_block]
with io.open(path, "w", encoding="utf-8", newline="\n") as fh:
    fh.writelines(lines)
print("parents replaced")

# ---------------------------------------------------------------- Memos
path = r"resources/js/Pages/Admin/Memos.tsx"
with io.open(path, encoding="utf-8") as fh:
    lines = fh.readlines()

# locate the dialog block dynamically
start = next(i for i, l in enumerate(lines) if l.strip().startswith("<Dialog open={open}"))
end = next(i for i in range(start, len(lines)) if lines[i].strip() == "</Dialog>") + 1

body = "".join(lines[start:end])
print("--- memos dialog preview ---")
print(body[:400])
print("...")
print(body[-400:])
