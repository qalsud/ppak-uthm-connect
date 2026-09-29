import { AlertTriangle, HeartPulse } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { useI18n } from '@/lib/i18n';
import { formatDate } from '@/lib/date';

export type StudentProfile = {
    id: number;
    name: string;
    mykid: string | null;
    date_of_birth: string | null;
    age: number | null;
    gender: string | null;
    nationality: string | null;
    ethnicity: string | null;
    religion: string | null;
    address: string | null;
    photo_url: string | null;
    enrolment_date: string | null;
    class: string;
    class_label: string;
    status: string;
    allergies: string | null;
    medical_notes: string | null;
    blood_type: string | null;
    immunisation_status: string | null;
    immunisation_notes: string | null;
    has_special_needs: boolean;
    special_needs_notes: string | null;
    dietary_restrictions: string | null;
    doctor_name: string | null;
    doctor_phone: string | null;
    medical_consent: boolean;
    medical_consent_at: string | null;
    alerts: string[];
};

/** One label/value pair, rendered only when there is a value. */
function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    return (
        <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className="break-words text-sm font-medium">{value}</p>
        </div>
    );
}

/** Read-only presentation of a child's identity, enrolment and medical record. */
export default function StudentProfileCard({ profile }: { profile: StudentProfile }) {
    const { t } = useI18n();

    const hasMedical =
        profile.allergies ||
        profile.medical_notes ||
        profile.blood_type ||
        profile.immunisation_status ||
        profile.has_special_needs ||
        profile.dietary_restrictions ||
        profile.doctor_name;

    return (
        <div className="space-y-4">
            {/* Safety strip — the things a teacher must not miss. */}
            {profile.alerts.length > 0 && (
                <div className="flex flex-wrap gap-2 rounded-xl border border-rose-200 bg-rose-50/60 p-3">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                        <AlertTriangle className="size-3.5" />
                        {t('safety_alerts')}
                    </span>
                    {profile.alerts.map((a) => (
                        <span
                            key={a}
                            className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700"
                        >
                            {t(`alert.${a}`)}
                        </span>
                    ))}
                </div>
            )}

            {/* Identity */}
            <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t('child_details')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        {profile.photo_url ? (
                            <img
                                src={profile.photo_url}
                                alt={profile.name}
                                className="size-24 shrink-0 rounded-xl object-cover"
                            />
                        ) : (
                            <div className="flex size-24 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl font-bold text-muted-foreground">
                                {profile.name.slice(0, 1).toUpperCase()}
                            </div>
                        )}

                        <div className="grid flex-1 gap-x-4 gap-y-3 sm:grid-cols-3">
                            <Row label={t('name')} value={profile.name} />
                            <Row label={t('mykid')} value={profile.mykid} />
                            <Row
                                label={t('date_of_birth')}
                                value={profile.date_of_birth ? formatDate(profile.date_of_birth) : null}
                            />
                            <Row label={t('age')} value={profile.age} />
                            <Row label={t('gender')} value={profile.gender ? t(`gender.${profile.gender}`) : null} />
                            <Row
                                label={t('nationality')}
                                value={profile.nationality ? t(`nationality.${profile.nationality}`) : null}
                            />
                            <Row label={t('ethnicity')} value={profile.ethnicity} />
                            <Row label={t('religion')} value={profile.religion} />
                            <Row label={t('class')} value={profile.class_label} />
                            <Row
                                label={t('enrolment_date')}
                                value={profile.enrolment_date ? formatDate(profile.enrolment_date) : null}
                            />
                            <div className="sm:col-span-2">
                                <Row label={t('address')} value={profile.address} />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Medical */}
            <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <HeartPulse className="size-4 text-primary" />
                        {t('health_information')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {!hasMedical ? (
                        <p className="text-sm text-muted-foreground">{t('no_health_info')}</p>
                    ) : (
                        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                            <Row label={t('allergies')} value={profile.allergies} />
                            <Row label={t('blood_type')} value={profile.blood_type} />
                            <Row
                                label={t('immunisation_status')}
                                value={
                                    profile.immunisation_status
                                        ? t(`immunisation.${profile.immunisation_status}`)
                                        : null
                                }
                            />
                            <Row
                                label={t('special_needs')}
                                value={profile.has_special_needs ? t('yes') : null}
                            />
                            <Row label={t('dietary_restrictions')} value={profile.dietary_restrictions} />
                            <Row label={t('doctor_name')} value={profile.doctor_name} />
                            <Row label={t('doctor_phone')} value={profile.doctor_phone} />
                            <div className="sm:col-span-2">
                                <Row label={t('immunisation_notes')} value={profile.immunisation_notes} />
                            </div>
                            <div className="sm:col-span-2">
                                <Row label={t('special_needs_notes')} value={profile.special_needs_notes} />
                            </div>
                            <div className="sm:col-span-2">
                                <Row label={t('medical_notes')} value={profile.medical_notes} />
                            </div>
                        </div>
                    )}

                    <div className="mt-4 border-t pt-3">
                        <div className="flex items-center gap-2">
                            <span
                                className={`size-2 shrink-0 rounded-full ${
                                    profile.medical_consent ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                            />
                            <p className="text-xs font-medium">
                                {profile.medical_consent
                                    ? t('medical_consent_given')
                                    : t('medical_consent_missing')}
                            </p>
                        </div>
                        {profile.medical_consent && profile.medical_consent_at && (
                            <p className="mt-1 text-[11px] text-muted-foreground">
                                {t('medical_consent_on')}: {formatDate(profile.medical_consent_at)}
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
