import type { InertiaFormProps } from '@inertiajs/react';

import FormDialog from '@/Components/form-dialog';
import { FormCheckbox, FormField, FormSection } from '@/Components/ui/form-field';
import { Input } from '@/Components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { Textarea } from '@/Components/ui/textarea';
import { localDate } from '@/lib/date';
import { useI18n } from '@/lib/i18n';
import { useList } from '@/lib/lists';
import type { CentreOption, ParentOption, Student } from '@/types/models';

export type StudentFormData = {
    name: string;
    age: string;
    class: string;
    parent_id: string;
    centre_id: string;
    mykid: string;
    date_of_birth: string;
    gender: string;
    nationality: string;
    ethnicity: string;
    religion: string;
    address: string;
    enrolment_date: string;
    allergies: string;
    medical_notes: string;
    blood_type: string;
    immunisation_status: string;
    immunisation_notes: string;
    has_special_needs: boolean;
    special_needs_notes: string;
    dietary_restrictions: string;
    doctor_name: string;
    doctor_phone: string;
    medical_consent: boolean;
};

export const emptyStudentForm: StudentFormData = {
    name: '',
    age: '',
    class: '5tahun',
    parent_id: '',
    centre_id: '',
    mykid: '',
    date_of_birth: '',
    gender: '',
    nationality: '',
    ethnicity: '',
    religion: '',
    address: '',
    enrolment_date: '',
    allergies: '',
    medical_notes: '',
    blood_type: '',
    immunisation_status: '',
    immunisation_notes: '',
    has_special_needs: false,
    special_needs_notes: '',
    dietary_restrictions: '',
    doctor_name: '',
    doctor_phone: '',
    medical_consent: false,
};

export default function StudentFormDialog({
    open,
    onOpenChange,
    editing,
    parents,
    centres,
    form,
    onSubmit,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editing: Student | null;
    parents: ParentOption[];
    centres: CentreOption[];
    form: InertiaFormProps<StudentFormData>;
    onSubmit: () => void;
}) {
    const { t } = useI18n();
    const classOptions = useList('class');
    const genderOptions = useList('gender');
    const nationalityOptions = useList('nationality');
    const bloodTypeOptions = useList('blood_type');
    const immunisationOptions = useList('immunisation_status');

    return (
        <FormDialog
            open={open}
            onOpenChange={onOpenChange}
            title={editing ? `${t('edit')} ${t('student')}` : `${t('add')} ${t('student')}`}
            onSubmit={onSubmit}
            submitLabel={editing ? t('save') : `${t('add')} ${t('student')}`}
            processing={form.processing}
            maxWidth="max-w-3xl"
        >
            <FormSection title={t('child_details')}>
                <FormField label={t('name')} error={form.errors.name} className="sm:col-span-2">
                    <Input
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                    />
                </FormField>

                <FormField label={t('class')}>
                    <Select value={form.data.class} onValueChange={(v) => form.setData('class', v)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {classOptions.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                    {c.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>

                {centres.length > 0 && (
                    <FormField label={t('assign_centre')} error={form.errors.centre_id}>
                        <Select
                            value={form.data.centre_id || 'none'}
                            onValueChange={(v) => form.setData('centre_id', v === 'none' ? '' : v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t('unassigned')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">{t('unassigned')}</SelectItem>
                                {centres.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </FormField>
                )}

                <FormField label={t('parent')} error={form.errors.parent_id}>
                    <Select
                        value={form.data.parent_id || 'none'}
                        onValueChange={(v) => form.setData('parent_id', v === 'none' ? '' : v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t('select_parent')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">{t('unassigned')}</SelectItem>
                            {parents.map((p) => (
                                <SelectItem key={p.id} value={p.id.toString()}>
                                    {p.name} · {p.email}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>

                <FormField label={t('mykid')}>
                    <Input
                        value={form.data.mykid}
                        onChange={(e) => form.setData('mykid', e.target.value)}
                        placeholder="080101-14-1234"
                    />
                </FormField>

                <FormField label={t('date_of_birth')} error={form.errors.date_of_birth}>
                    <Input
                        type="date"
                        max={localDate()}
                        value={form.data.date_of_birth}
                        onChange={(e) => form.setData('date_of_birth', e.target.value)}
                    />
                </FormField>

                <FormField label={t('gender')}>
                    <Select
                        value={form.data.gender || 'none'}
                        onValueChange={(v) => form.setData('gender', v === 'none' ? '' : v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">—</SelectItem>
                            {genderOptions.map((g) => (
                                <SelectItem key={g.value} value={g.value}>
                                    {g.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>

                <FormField label={t('nationality')}>
                    <Select
                        value={form.data.nationality || 'none'}
                        onValueChange={(v) => form.setData('nationality', v === 'none' ? '' : v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">—</SelectItem>
                            {nationalityOptions.map((n) => (
                                <SelectItem key={n.value} value={n.value}>
                                    {n.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>

                <FormField label={t('ethnicity')}>
                    <Input
                        value={form.data.ethnicity}
                        onChange={(e) => form.setData('ethnicity', e.target.value)}
                    />
                </FormField>

                <FormField label={t('religion')}>
                    <Input
                        value={form.data.religion}
                        onChange={(e) => form.setData('religion', e.target.value)}
                    />
                </FormField>

                <FormField label={t('address')} className="sm:col-span-2">
                    <Textarea
                        rows={2}
                        value={form.data.address}
                        onChange={(e) => form.setData('address', e.target.value)}
                    />
                </FormField>

                <FormField label={t('enrolment_date')}>
                    <Input
                        type="date"
                        max={localDate()}
                        value={form.data.enrolment_date}
                        onChange={(e) => form.setData('enrolment_date', e.target.value)}
                    />
                </FormField>

                <FormField label={t('age')} error={form.errors.age} hint={t('age_optional_hint')}>
                    <Input
                        type="number"
                        min={3}
                        max={10}
                        value={form.data.age}
                        onChange={(e) => form.setData('age', e.target.value)}
                    />
                </FormField>
            </FormSection>

            <FormSection title={t('health_information')}>
                <FormField label={t('allergies')} className="sm:col-span-2">
                    <Textarea
                        rows={2}
                        value={form.data.allergies}
                        onChange={(e) => form.setData('allergies', e.target.value)}
                        placeholder={t('allergies_placeholder')}
                    />
                </FormField>

                <FormField label={t('medical_notes')} className="sm:col-span-2">
                    <Textarea
                        rows={2}
                        value={form.data.medical_notes}
                        onChange={(e) => form.setData('medical_notes', e.target.value)}
                    />
                </FormField>

                <FormField label={t('blood_type')}>
                    <Select
                        value={form.data.blood_type || 'none'}
                        onValueChange={(v) => form.setData('blood_type', v === 'none' ? '' : v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">—</SelectItem>
                            {bloodTypeOptions.map((b) => (
                                <SelectItem key={b.value} value={b.value}>
                                    {b.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>

                <FormField label={t('immunisation_status')}>
                    <Select
                        value={form.data.immunisation_status || 'none'}
                        onValueChange={(v) => form.setData('immunisation_status', v === 'none' ? '' : v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">—</SelectItem>
                            {immunisationOptions.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>

                <FormField label={t('immunisation_notes')} className="sm:col-span-2">
                    <Textarea
                        rows={2}
                        value={form.data.immunisation_notes}
                        onChange={(e) => form.setData('immunisation_notes', e.target.value)}
                    />
                </FormField>

                <FormField label={t('dietary_restrictions')} className="sm:col-span-2">
                    <Textarea
                        rows={2}
                        value={form.data.dietary_restrictions}
                        onChange={(e) => form.setData('dietary_restrictions', e.target.value)}
                    />
                </FormField>

                <FormField label={t('doctor_name')}>
                    <Input
                        value={form.data.doctor_name}
                        onChange={(e) => form.setData('doctor_name', e.target.value)}
                    />
                </FormField>

                <FormField label={t('doctor_phone')}>
                    <Input
                        value={form.data.doctor_phone}
                        onChange={(e) => form.setData('doctor_phone', e.target.value)}
                    />
                </FormField>

                <FormCheckbox
                    label={t('special_needs')}
                    description={t('special_needs_notes')}
                    checked={form.data.has_special_needs}
                    onChange={(v) => form.setData('has_special_needs', v)}
                    className="sm:col-span-2"
                />

                {form.data.has_special_needs && (
                    <FormField label={t('special_needs_notes')} className="sm:col-span-2">
                        <Textarea
                            rows={2}
                            value={form.data.special_needs_notes}
                            onChange={(e) => form.setData('special_needs_notes', e.target.value)}
                        />
                    </FormField>
                )}

                <FormCheckbox
                    label={t('medical_consent')}
                    description={t('medical_consent_hint')}
                    checked={form.data.medical_consent}
                    onChange={(v) => form.setData('medical_consent', v)}
                    className="sm:col-span-2"
                />
            </FormSection>
        </FormDialog>
    );
}
