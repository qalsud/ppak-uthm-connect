export type PhotoInfo = {
    id: number;
    url: string;
    thumb: string;
    note: string | null;
    uploaded_by: string | null;
    created_at: string | null;
};

/** @deprecated kept as an alias of {@see PhotoInfo}. */
export type AttendancePhotoInfo = PhotoInfo;
