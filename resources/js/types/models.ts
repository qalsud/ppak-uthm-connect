export type Student = {
    id: number;
    name: string;
    age: number | null;
    class: string;
    status: 'active' | 'withdrawn' | 'graduated';
    allergies: string | null;
    medical_notes: string | null;
    centre_id?: number | null;
    centre?: CentreOption | null;
    mykid?: string | null;
    date_of_birth?: string | null;
    gender?: string | null;
    nationality?: string | null;
    ethnicity?: string | null;
    religion?: string | null;
    address?: string | null;
    enrolment_date?: string | null;
    blood_type?: string | null;
    immunisation_status?: string | null;
    immunisation_notes?: string | null;
    has_special_needs?: boolean;
    special_needs_notes?: string | null;
    dietary_restrictions?: string | null;
    doctor_name?: string | null;
    doctor_phone?: string | null;
    medical_consent?: boolean;
    parent: ParentOption | null;
};

export type ParentOption = { id: number; name: string; email: string };

export type CentreOption = { id: number; name: string; short_name: string | null };
