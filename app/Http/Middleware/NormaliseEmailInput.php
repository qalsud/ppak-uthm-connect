<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * MySQL collations compare emails case-insensitively; Postgres does not. Trim
 * and lowercase the `email` field before validation so login, uniqueness rules
 * and password resets behave the same on both databases.
 */
class NormaliseEmailInput
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethodSafe()) {
            return $next($request);
        }

        $email = $request->input('email');

        if (is_string($email)) {
            $request->merge(['email' => Str::lower(trim($email))]);
        }

        return $next($request);
    }
}
