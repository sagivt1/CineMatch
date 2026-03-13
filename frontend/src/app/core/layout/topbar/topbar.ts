import { Component, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
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
    @ViewChild('profileMenu') private readonly profileMenu?: ElementRef<HTMLDetailsElement>;

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

    closeProfileMenu(): void {
        if (this.profileMenu?.nativeElement?.open) {
            this.profileMenu.nativeElement.open = false;
        }
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        const menu = this.profileMenu?.nativeElement;
        if (!menu?.open) return;
        const target = event.target as Node;
        if (!menu.contains(target)) {
            menu.open = false;
        }
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        this.closeProfileMenu();
    }
}
