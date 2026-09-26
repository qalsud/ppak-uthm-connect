<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Route middleware for role guarding: ->middleware('role:admin,teacher')
 */
class CheckRole
{
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(401);
        }

        $allowed = array_map(fn ($role) => UserRole::from($role)->value, $roles);

        if (! in_array($user->role->value, $allowed, true)) {
            abort(403, __('auth.forbidden'));
        }

        return $next($request);
    }
}
