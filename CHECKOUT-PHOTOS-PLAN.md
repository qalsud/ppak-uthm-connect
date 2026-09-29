# Feature Plan — Checkout Photo (image uploads)

**Status:** ✅ Implemented (Phase 0 + Phase 1). Phase 2 partly shipped, Phase 3 partly shipped (both tracked at the bottom). Updated 29 Sep 2026.
**Scope:** Teacher submits a photo when checking a child out ("Back home"). Built as the first consumer of a reusable image-upload capability.

**Addendum (implemented):**
- **Timestamp watermark** — every stored photo is stamped bottom-left with `PPAK UTHM · Check out`, the **child's name** and the **date/time** (`d/m/Y H:i`, app timezone), Shopee-style, on a translucent band. Drawn with FreeType (`resources/fonts/DejaVuSans-Bold.ttf`).
- **Auto-compression to ≤ 1 MB** — the pipeline lowers JPEG quality (down to 40) then shrinks dimensions (area-based estimate) until the file fits `media.target_kb` (default 1 MB).
- **Progress photos (Phase 3, done)** — the pipeline is now shared: `ImageStore`, `PhotoController` (authorised streaming), `HasStoredImage` trait, `PhotoUpload`/`PhotoThumb` components and `media:prune-photos`. Teachers can attach a photo when recording progress; it's watermarked, shown on the teacher/parent views and **posted to the parent chat**. Progress photos are **optional**.
- **Chat attachments (done)** — parents and teachers can attach up to **3 photos per message** through the same pipeline (re-encode, EXIF/GPS stripped, thumbnail, private disk). A pruned photo degrades gracefully to *"Photo no longer available"* instead of a broken bubble.

---

## 1. Goal

When a teacher checks a child out, they must **attach a photo** (proof of who collected the child / the child leaving). The photo is stored securely, shown on the attendance record, and visible to the child's parent.

Secondary goal: build a **reusable image pipeline** so future features (arrival photo, daily-activity photos, progress photos, avatars) reuse one service instead of re-implementing uploads.

---

## 2. Current state (verified)

| Area | Today |
|---|---|
| Checkout | `POST teacher/attendance/{student}` with `action=depart`; sets `attendance.departed_at` + `departed_by`. **No photo, no proof.** |
| Parent checkout | Parents can also mark "Bring home" via `parent.attendance.store` (no photo). |
| Storage | `public` + `local` disks configured. **`public/storage` symlink not created.** `FILESYSTEM_DISK=local`. |
| Image libs | `gd`, `exif`, `fileinfo` present. **No Imagick, no `intervention/image`.** |
| Uploads | Only CSV import (`mimes:csv,txt`, `forceFormData`). No image handling. |
| Serialization | `Attendance::summary()` / `historyRow()` feed the teacher + parent pages. |

---

## 3. Key decisions (confirmed)

1. **Who can check in/out?** → **Teachers only.** Parents no longer see "Send to school" / "Bring home" — their attendance views are **read-only** (status + history + checkout photos). ✅ *Shipped (Phase 0).*
2. **Is the photo required?** → Yes, with a **documented override** (skip + reason) for edge cases. ✅ *Shipped.*
3. **Storage privacy** → **Private disk** (`attendance`, `storage/app/attendance`), served through an **authorised route**. ✅ *Shipped.*
4. **Photo subject** → Copy: *"Photograph the child with the person collecting them."* ✅ *Shipped.*
5. **Retention** → **Auto-delete after 3 days** via `attendance:prune-photos` (scheduled 03:00). ✅ *Shipped.*
6. **Arrival photos** → Not now; schema supports them for later. ✅
7. **Notify parents** → Yes: post the photo **into the parent ↔ teacher chat** + a bell notification. ✅ *Shipped.*

### Parent experience after Phase 0

| Page | Before | After |
|---|---|---|
| Parent dashboard child card | "Send to school" + "Bring home" buttons | **Status chip + checkout photo (read-only)** |
| Parent attendance page | Mark + history | **Status + photo + history (read-only)** |
| Parent child page | Mark + history | **Status + photo + history (read-only)** |
| Backend | `parent.attendance.store` open | **Route removed**; parents can't POST attendance |

Teachers are the sole writers via `teacher.attendance.store` (arrive) and `teacher.attendance.checkout` (depart + photo).

---

## 4. Data model

### New table `attendance_photos`

Chosen over columns on `attendance` because it supports **multiple photos**, **both events** (checkout now, check-in later), captions and metadata without further migrations.

```php
Schema::create('attendance_photos', function (Blueprint $table) {
    $table->id();
    $table->foreignId('attendance_id')->constrained('attendance')->cascadeOnDelete();
    $table->foreignId('student_id')->constrained('students')->cascadeOnDelete(); // denormalised for authz/queries
    $table->string('type', 20)->default('checkout');       // checkout | checkin (future)
    $table->string('disk', 50)->default('local');
    $table->string('path');                                  // original (re-encoded jpeg)
    $table->string('thumb_path')->nullable();                // small preview
    $table->string('original_name')->nullable();
    $table->string('mime', 50)->default('image/jpeg');
    $table->unsignedInteger('size')->nullable();             // bytes
    $table->unsignedInteger('width')->nullable();
    $table->unsignedInteger('height')->nullable();
    $table->string('note', 255)->nullable();                 // "collected by grandmother"
    $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();

    $table->index(['attendance_id', 'type']);
    $table->index('student_id');
});
```

New model `App\Models\AttendancePhoto`:
- `belongsTo(Attendance)`, `belongsTo(Student)`, `belongsTo(User, 'uploaded_by')`
- `url(): string` → `route('attendance.photos.show', $this)`
- `thumbUrl(): ?string` → same route + thumb variant

`Attendance` gets `hasMany(AttendancePhoto)`; `Student` too.

### Attendance checkout metadata

Add nullable columns to `attendance` for the override + audit trail:
```php
$table->string('checkout_note', 255)->nullable();
$table->boolean('checkout_photo_override')->default(false); // staff skipped the photo
$table->string('checkout_override_reason', 255)->nullable();
```
(Photo count stays in `attendance_photos`.)

---

## 5. Storage & privacy

- New disk `attendance` (private): `storage_path('app/attendance')` — **not** web-reachable.
- Files written under `attendance/{Y}/{m}/{ulid}.jpg` (+ `…-thumb.jpg`).
- **Served only** via `GET /attendance/photos/{attendancePhoto}` (`attendance.photos.show`) which authorises:
  - **admin** → any photo
  - **teacher** → any photo (staff)
  - **parent** → only if `photo.student_id` belongs to them
  - else `403`; guests redirect to login.
- Response: `Storage::disk($photo->disk)->response(...)` with `Content-Type: image/jpeg`, `Cache-Control: private, max-age=86400`, `X-Content-Type-Options: nosniff`. `?variant=thumb` serves the thumbnail.
- **No public symlink required** (avoids the `storage:link` dependency on shared hosting).

> If we ever move to S3, only the disk changes; the route + authz stay the same.

---

## 6. Image pipeline (`App\Services\Images\ImageStore`)

Reusable service — the core of "images can be uploaded".

```
store(UploadedFile $file, array $options = []): StoredImage
```

Steps:
1. Verify with `getimagesize()` (rejects spoofed mime / non-images).
2. Re-encode through **GD** → JPEG quality 80 → **strips all EXIF (incl. GPS)**.
3. Auto-orient using EXIF orientation before stripping.
4. Downscale to `max_width` 1600px (configurable) preserving aspect.
5. Generate a **thumbnail** (max 320px).
6. Safe random name `Str::ulid().'.jpg'` (non-guessable).
7. Return a `StoredImage` DTO `{ disk, path, thumbPath, mime, size, width, height }`.
8. `delete(StoredImage)` helper for undo.

Config `config/media.php` (env-driven):
```php
'disk' => env('MEDIA_DISK', 'attendance'),
'max_upload_kb' => env('MEDIA_MAX_UPLOAD_KB', 10240),   // 10 MB
'max_dimension' => env('MEDIA_MAX_DIMENSION', 1600),
'thumb_dimension' => 320,
'quality' => 80,
'allowed_mimes' => ['image/jpeg','image/png','image/webp'],
```

**HEIC note:** iPhone HEIC can't be decoded by GD without extra tooling. Plan: accept `image/*` in the picker but validate jpeg/png/webp server-side and show a clear "unsupported format" message; many Android/desktop browsers already convert. Revisit if users report HEIC.

---

## 7. Backend

### Routes (`routes/web.php`)
| Method | URI | Name | Who |
|---|---|---|---|
| POST | `/teacher/attendance/{student}/checkout` | `teacher.attendance.checkout` | teacher |
| GET | `/attendance/photos/{attendancePhoto}` | `attendance.photos.show` | auth + authz |
| DELETE | `/teacher/attendance/photos/{attendancePhoto}` | `teacher.attendance.photo.destroy` | teacher (Phase 2 undo) |

Restrict the existing `teacher.attendance.store` to `action=arrive` only (or leave it but reject `depart` without a photo).

### `Teacher\AttendanceController@checkout`
```php
$data = $request->validate([
    'photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
    'note'  => ['nullable', 'string', 'max:255'],
    'date'  => ['nullable', 'date', 'before_or_equal:today'],
    'override_reason' => ['nullable', 'string', 'max:255', 'required_if:skip_photo,1'],
]);
```
1. Resolve/insert today's `Attendance` (auto-fill arrival if missing, as today).
2. If already departed → allow re-depart (staff correction) but keep an audit trail.
3. `ImageStore->store()` → create `AttendancePhoto(type: checkout, uploaded_by, note)`.
4. Set `departed_at = now()`, `departed_by`, `checkout_note`.
5. Notify the parent (new `CheckoutRecordedNotification`).
6. `back()` with success + the photo summary.

Override path (flag + missing photo): require `override_reason`, set `checkout_photo_override = true`, and notify the **admin** as well.

### `AttendancePhotoController@show`
Authz helper (or a policy) as described in §5; streams the file.

### Serialization changes
- `AttendancePhoto` → `{ id, url, thumb_url, note, uploaded_by, created_at }`.
- `Attendance::summary()` / `historyRow()` gain `checkout_photo` (latest checkout photo summary) and `checkout_note`.
- Teacher `Attendance@index` and parent attendance/child controllers eager-load `photos` to avoid N+1.

---

## 8. Frontend

### New components
| Component | Purpose |
|---|---|
| `Components/photo-upload.tsx` | Camera/gallery input (`accept="image/*" capture="environment"`), client-side type+size check, instant preview, remove/retake. Reusable. |
| `Components/checkout-dialog.tsx` | Confirm checkout + photo + optional note (+ override reason when needed). |
| `Components/photo-thumb.tsx` | Thumbnail that opens a full-screen viewer. |
| `Components/photo-viewer.tsx` | Lightbox (img + close), used by teacher & parent. |

### `AttendanceActions` change
- For **teacher** role, "Back home" no longer posts directly — it opens `CheckoutDialog`.
- After success the record refreshes and shows a thumbnail.
- Parent role: "Bring home" removed (decision #1) — parents see status + checkout photo only.

### Where photos appear
- **Teacher register** (`/teacher/attendance`): thumbnail in the row/card + note; tap to view.
- **Teacher dashboard** cards: small checkout indicator.
- **Parent attendance** (`/parent/attendance`) + **child page**: thumbnail + "checked out at HH:MM".
- **Parent dashboard** child card: subtle "collected ✓ photo" hint.

### UX details
- Show live time in the dialog ("Checking out now · 17:12").
- Disable **Confirm** until a photo is selected (unless override).
- Uploading spinner; on failure keep the photo and show the error.
- Mobile-first: big tap targets, camera button; works fine on desktop (file picker).
- i18n keys (EN/BM) for all strings.

---

## 9. Edge cases & failure modes

| Case | Handling |
|---|---|
| Teacher checks out without photo | Blocked client + server (unless override w/ reason). |
| Camera/permission denied on phone | Override with reason (staff), admin notified. |
| Very large photo (12 MP) | Client warns; server downscales to 1600px, ≤10 MB cap. |
| HEIC upload | Clear "unsupported format" error. |
| Duplicate checkout (already home) | Treated as a correction; photo appended, prior kept. |
| Past-date register edit | Checkout photo allowed but flagged (date ≠ today). |
| Deleted student/attendance | Photos cascade-delete (DB) + best-effort file cleanup via model `deleted` hook. |
| Offline | Standard Inertia failure; retry. (No offline queue in MVP.) |
| Photo route hit by other parent | 403. |

---

## 10. Security & privacy checklist

- [x] Private storage, non-guessable filenames
- [x] Authorised streaming route (parent scoped to own child)
- [x] Re-encode + **EXIF/GPS stripped**
- [x] Server-side type/size validation (no trust in client)
- [x] `nosniff`, private cache headers
- [ ] Upload rate-limiting (`throttle:30,1` on checkout) — add
- [ ] Retention policy + cleanup command (Phase 2)
- [ ] Consent note in privacy policy (product-level)

---

## 11. Config / env / hosting

`.env` additions:
```
MEDIA_DISK=attendance
MEDIA_MAX_UPLOAD_KB=10240
MEDIA_MAX_DIMENSION=1600
CHECKOUT_PHOTO_REQUIRED=true
CHECKOUT_PHOTO_RETENTION_DAYS=0   # 0 = keep forever
```
- Local: private disk, no symlink needed.
- Hosting (Hostinger): ensure `storage/app/attendance` is writable + **included in backups**. If we choose the public disk instead, `php artisan storage:link` becomes mandatory — another reason to prefer private.

---

## 12. Test plan (Pest)

- Checkout **without** photo → validation error, no `attendance_photos` row.
- Checkout **with** photo (`Storage::fake`) → photo row + `departed_at`/`departed_by` set.
- Non-image file rejected; oversize rejected.
- Parent cannot check out (403/404) after rule change.
- Photo route: admin 200 · teacher 200 · owner parent 200 · **other parent 403** · guest redirect.
- Thumbnail variant returns an image.
- Override: missing photo + reason → `checkout_photo_override = true` + admin notified.
- Existing attendance tests updated (checkout now needs a photo).
- Frontend: browser smoke — dialog opens, preview shows, confirm disabled without photo, success renders thumbnail, parent sees it, no console errors.

---

## 13. Phased delivery

**Phase 0 — Teacher-only attendance (ship now, independent of photos)** ✅ *shipped*
Remove `parent.attendance.store` + controller action · `AttendanceActions` renders a **read-only status chip** for the parent role · parent dashboard child cards lose the two buttons · parent attendance/child pages become read-only · update tests + copy.

**Phase 1 — MVP (the photo feature)** ✅ *shipped*
`attendance_photos` + `ImageStore` + private disk + authz route · teacher checkout dialog (required photo) · override w/ reason · thumbnails · teacher/parent visibility · tests + i18n.

**Phase 2 — Hardening** 🟡 *partly shipped*
- ✅ Parent notification on **check-out** (with the photo posted into the chat) **and on check-in**
- ✅ Retention/cleanup command — `media:prune-photos` (default 3 days)
- ✅ Admins can review photos on the student detail page
- ✅ **Check-in health** — optional **temperature + health note** captured on arrival (amber "Elevated"
  flag at ≥ 37.5 °C); the closest thing to the "arrival photo" without the extra friction
- ⬜ Undo/delete photo (audited) · ⬜ multiple photos per checkout · ⬜ arrival (drop-off) photo ·
  ⬜ dedicated admin photo-review page

**Phase 3 — Generalise** 🟡 *partly shipped*
- ✅ `ImageStore` reused for **progress photos** and **chat attachments** (re-encode + EXIF strip +
  watermark + ≤1 MB + thumbnail + private disk)
- ⬜ Promote to a `media` table and a shared upload UI across daily activities, profile avatars, memos

---

## 14. Open questions — resolved

1. Teacher-only check-in/out? **Yes** — parents are read-only ✅ *(Phase 0)*
2. Photo always required, or a documented override? **Required, with an override + reason** ✅
3. Private disk + authorised route? **Yes** ✅
4. Copy: child alone, or child + the person collecting? **Child + the person collecting** ✅
5. Retention limit? **3 days by default** (`CHECKOUT_PHOTO_RETENTION_DAYS`) ✅
6. Arrival (drop-off) photos in the same pass? **No** — arrival instead captures **temperature + health note** ✅
7. Notify parents on checkout with a photo? **Yes** ✅
