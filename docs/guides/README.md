# User guides

Five-page demo handouts for each role:

| Role | PDF | Source |
|---|---|---|
| Admin | [`PPAK-Admin-Guide.pdf`](PPAK-Admin-Guide.pdf) | [`src/admin.html`](src/admin.html) |
| Teacher | [`PPAK-Teacher-Guide.pdf`](PPAK-Teacher-Guide.pdf) | [`src/teacher.html`](src/teacher.html) |
| Parent | [`PPAK-Parent-Guide.pdf`](PPAK-Parent-Guide.pdf) | [`src/parent.html`](src/parent.html) |

The guides use the seeded demo emails (`admin@ppakuthm.com`, `teacher@ppakuthm.com`,
`parent@ppakuthm.com`) but **do not contain passwords**. Share the current demo passwords
separately.

## Updating a guide

1. Edit the HTML in [`src/`](src) and the shared [`src/guide.css`](src/guide.css).
2. Open the HTML in Chrome or Edge.
3. Print → **Save as PDF**:
   - paper size **A4**
   - margins **None**
   - **Background graphics** enabled
   - headers and footers disabled.
4. Keep each guide at exactly **5 pages**.

The PDFs were generated with headless Chrome using `preferCSSPageSize`, so the A4 `@page` rule in
`guide.css` is what controls the pagination. Do not add content that pushes a page past 297mm.
