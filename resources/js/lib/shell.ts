import { adminBottomNav, adminNav, teacherBottomNav, teacherNav, type NavItem } from '@/lib/navigation';

/**
 * Teacher screens are reused by admins (Phase A: "admin can act everywhere a
 * teacher can"). The server sends `shell` so the same page renders in the right
 * chrome instead of duplicating every screen.
 */
export function shellFor(shell: string | undefined): {
    nav: NavItem[];
    bottomNav: NavItem[];
    title: string;
    /** True when the current user is an admin acting on a teacher screen. */
    isAdmin: boolean;
} {
    return shell === 'admin'
        ? { nav: adminNav, bottomNav: adminBottomNav, title: 'admin', isAdmin: true }
        : { nav: teacherNav, bottomNav: teacherBottomNav, title: 'teacher', isAdmin: false };
}

/**
 * Resolve the action URL for a teacher screen. Admins post to the `admin.register.*`
 * equivalents, which reuse the same controllers but pass `role:admin`.
 *
 * @param teacherRoute name without the `teacher.` prefix, e.g. 'attendance.store'
 */
export function actionRoute(isAdmin: boolean, teacherRoute: string, params?: Record<string, unknown>): string {
    const name = isAdmin ? `admin.register.${teacherRoute}` : `teacher.${teacherRoute}`;

    return route(name, params);
}

/** Base URL for a teacher screen (used for redirects/partial reloads). */
export function actionUrl(isAdmin: boolean, teacherPath: string): string {
    return isAdmin ? `/admin/register/${teacherPath}` : `/teacher/${teacherPath}`;
}

/** Whether the current user is an admin acting on a teacher screen. */
export function isAdminShell(shell: string | undefined): boolean {
    return shell === 'admin';
}

