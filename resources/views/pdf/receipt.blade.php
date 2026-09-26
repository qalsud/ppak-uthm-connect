<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Resit / Receipt — PPAK UTHM</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #222; margin: 32px; }
        h1 { color: #2d6abb; margin: 0 0 4px; font-size: 22px; }
        .muted { color: #666; font-size: 12px; }
        .brand { border-bottom: 3px solid #e3685b; padding-bottom: 12px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13px; }
        th, td { border: 1px solid #ddd; padding: 7px 10px; text-align: left; }
        th { background: #f3f4f6; }
        .total { font-weight: bold; background: #f3f4f6; }
        .row { display: flex; justify-content: space-between; margin-top: 6px; font-size: 13px; }
        .footer { margin-top: 26px; font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 10px; }
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
                    <img src="{{ $ppakLogo }}" style="height:52px;vertical-align:middle;" alt="PPAK">
                    <span style="font-size:20px;font-weight:bold;color:#152259;margin-left:10px;vertical-align:middle;">PPAK UTHM CONNECT</span>
                </td>
                <td style="border:none;padding:0;text-align:right;vertical-align:middle;">
                    <img src="{{ $uthmLogo }}" style="height:38px;" alt="UTHM">
                </td>
            </tr>
        </table>
        <p class="muted" style="margin:8px 0 0;">Pusat Pendidikan Awal Kanak-Kanak, Universiti Tun Hussein Onn Malaysia</p>
    </div>

    <div class="row"><span>Resit No. / Receipt No.</span><strong>PPAK-{{ $payment->id }}-{{ $payment->created_at->format('Y') }}</strong></div>
    <div class="row"><span>Tarikh / Date</span><strong>{{ $payment->paid_at?->format('d/m/Y H:i') ?? $issuedAt->format('d/m/Y H:i') }}</strong></div>
    <div class="row"><span>Ibu bapa / Parent</span><strong>{{ $payment->user->name }}</strong></div>
    <div class="row"><span>Murid / Student</span><strong>{{ $payment->student->name }}</strong></div>
    <div class="row"><span>Kelas / Class</span><strong>{{ \App\Models\Student::classLabelStatic($payment->student->class) }}</strong></div>

    <table>
        <thead>
            <tr>
                <th>Bulan / Month</th>
                <th>Jumlah / Amount</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($records as $record)
                <tr>
                    <td>{{ $record->month }}</td>
                    <td>RM {{ number_format((float) $record->amount, 2) }}</td>
                </tr>
            @endforeach
            <tr class="total">
                <td>JUMLAH / TOTAL</td>
                <td>RM {{ number_format((float) $payment->amount, 2) }}</td>
            </tr>
        </tbody>
    </table>

    <div class="footer">
        Resit ini dijana secara automatik oleh sistem PPAK UTHM Connect.
        This receipt was generated automatically by the PPAK UTHM Connect system.
    </div>
</body>
</html>