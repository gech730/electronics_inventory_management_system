<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
       public function handle( Request $request,Closure $next,string ...$roles
    ): Response {
        if (!$request->user()) {
            abort(401);
        }

        if (!in_array($request->user()->role, $roles, true)) {
    return redirect('/dashboard')
        ->with('error', 'You are not authorized to access that page.');
}

        return $next($request);
    }
}
