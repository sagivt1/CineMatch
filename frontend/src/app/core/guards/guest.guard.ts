import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Prevents authenticated users from accessing "guest" routes (e.g., login, register).
 * Redirects them to the home page instead.
 */
export const guestGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
        return true;
    }

    // Authenticated users shouldn't see these—redirect to the main experience.
    return router.createUrlTree(['/']);
};
