<?php

namespace App\Http\Controllers;

use App\Services\Payments\PaymentCompletionService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Stripe\Webhook;

class StripeWebhookController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $endpointSecret = config('services.stripe.webhook_secret');

        // No webhook configured → acknowledge and move on (local/dev mode).
        if (! $endpointSecret) {
            return response('ok');
        }

        try {
            $event = Webhook::constructEvent(
                $request->getContent(),
                $request->header('Stripe-Signature', ''),
                $endpointSecret
            );
        } catch (\Exception $e) {
            report($e);

            return response('Signature verification failed', 400);
        }

        if ($event->type === 'checkout.session.completed') {
            $sessionId = $event->data['object']['id'] ?? null;

            if ($sessionId) {
                app(PaymentCompletionService::class)->markSessionCompleted($sessionId);
            }
        }

        return response('ok');
    }
}
