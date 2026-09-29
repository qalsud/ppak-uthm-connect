<?php
foreach (App\Models\Message::withTrashed()->latest('id')->limit(15)->get(['id','body','type','sender_id']) as $m) {
    echo $m->id.' | '.$m->type.' | sender='.$m->sender_id.' | '.json_encode($m->body).PHP_EOL;
}
echo '--- count ---'.App\Models\Message::withTrashed()->count().PHP_EOL;
