import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterLink, RouterLinkActive],
    templateUrl: './topbar.html',
    styleUrl: './topbar.css'
})
export class TopbarComponent {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    readonly isAuthenticated = this.auth.isAuthenticated;
    readonly user = this.auth.currentUser;

    getAvatarInitials(): string {
        const name = this.user()?.displayName ?? '';
        const initials = name
            .split(' ')
            .filter(Boolean)
            .map((part) => part[0]?.toUpperCase())
            .slice(0, 2)
            .join('');

        return initials || 'CM';
    }

    onLogout(): void {
        this.auth.logout();
        this.router.navigate(['/']);
    }
}
