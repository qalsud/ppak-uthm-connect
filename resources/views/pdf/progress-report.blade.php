<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Laporan Perkembangan / Progress Report — PPAK UTHM</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #222; margin: 28px; font-size: 12px; }
        h1 { color: #2d6abb; margin: 0 0 6px; font-size: 20px; }
        .muted { color: #666; font-size: 11px; }
        .brand { border-bottom: 3px solid #e3685b; padding-bottom: 10px; margin-bottom: 14px; }
        table.meta { width: 100%; border-collapse: collapse; margin-top: 4px; }
        table.meta td { padding: 4px 12px 4px 0; vertical-align: top; width: 33%; }
        table.meta strong { color: #152259; font-size: 11px; }
        table.grid { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 10.5px; }
        table.grid th, table.grid td { border: 1px solid #ddd; padding: 5px 7px; text-align: left; vertical-align: top; }
        table.grid th { background: #f3f4f6; color: #152259; }
        .summary { margin-top: 10px; }
        .chip { background: #f3f4f6; border-radius: 8px; padding: 3px 9px; margin-right: 8px; display: inline-block; }
        .footer { margin-top: 20px; font-size: 10px; color: #888; border-top: 1px solid #ddd; padding-top: 8px; }
    </style>
</head>
<body>
    <div class="brand">
        @php
            $ppakLogo = 'data:image/png;base64,'.base64_encode(file_get_contents(public_path('images/logo-ppak.png')));
            $uthmLogo = 'data:image/png;base64,'.base64_encode(file_get_contents(public_path('images/logo-uthm.png')));
        @endphp
        <table style="width:100%;border-collapse:collapse;">
            <tr>
                <td style="border:none;padding:0;vertical-align:middle;">
                    <img src="{{ $ppakLogo }}" style="height:46px;vertical-align:middle;" alt="PPAK">
                    <span style="font-size:18px;font-weight:bold;color:#152259;margin-left:10px;vertical-align:middle;">PPAK UTHM CONNECT</span>
                </td>
                <td style="border:none;padding:0;text-align:right;vertical-align:middle;">
                    <img src="{{ $uthmLogo }}" style="height:34px;" alt="UTHM">
                </td>
            </tr>
        </table>
        <p class="muted" style="margin:6px 0 0;">Pusat Pendidikan Awal Kanak-Kanak, Universiti Tun Hussein Onn Malaysia</p>
    </div>

    <h1>Laporan Perkembangan / Progress Report</h1>

    <table class="meta">
        <tr>
            <td><strong>Murid / Student</strong><br>{{ $student->name }}</td>
            <td><strong>Kelas / Class</strong><br>{{ $student->classLabel }}</td>
            <td><strong>Pusat / Centre</strong><br>{{ $student->centre?->name ?? '—' }}</td>
        </tr>
        <tr>
            <td><strong>Ibu bapa / Parent</strong><br>{{ $student->parent?->name ?? '—' }}</td>
            <td><strong>Tempoh / Period</strong><br>{{ $from ? $from->format('d/m/Y') : '—' }} – {{ $to ? $to->format('d/m/Y') : '—' }}</td>
            <td><strong>Dijana / Generated</strong><br>{{ $issuedAt->format('d/m/Y H:i') }}</td>
        </tr>
    </table>

    <p class="summary">
        <span class="chip">Jumlah rekod / Records: <strong>{{ $counts['total'] }}</strong></span>
        <span class="chip">Baik / Good: <strong>{{ $counts['good'] }}</strong></span>
        <span class="chip">Sederhana / Average: <strong>{{ $counts['average'] }}</strong></span>
        <span class="chip">Lemah / Poor: <strong>{{ $counts['poor'] }}</strong></span>
    </p>

    @if ($records->isEmpty())
        <p class="muted" style="margin-top:16px;">Tiada rekod dalam tempoh ini. / No records in this period.</p>
    @else
        <table class="grid">
            <thead>
                <tr>
                    <th style="width:64px;">Tarikh<br>Date</th>
                    <th>Tema<br>Theme</th>
                    <th>PERMATA</th>
                    <th>Bebas<br>Free</th>
                    <th>Pencapaian<br>Activity</th>
                    <th>Kemahiran<br>Proficiency</th>
                    <th>Perkembangan<br>Development</th>
                    <th>Catatan<br>Notes</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($records as $record)
                    <tr>
                        <td>{{ $record->date?->format('d/m/Y') }}</td>
                        <td>{{ $record->sub_theme ?: '—' }}</td>
                        <td>{{ $record->permata_activity }}</td>
                        <td>{{ $record->free_activity }}</td>
                        <td>{{ $record->activity_done }}</td>
                        <td>{{ $record->child_proficiency }}</td>
                        <td>{{ $record->development_proficiency }}</td>
                        <td>{{ $record->notes ?: '—' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    <div class="footer">
        Dijana secara automatik oleh sistem PPAK UTHM Connect.
        This report was generated automatically by the PPAK UTHM Connect system.
    </div>
</body>
</html>
