import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, LucideIconProvider, LUCIDE_ICONS, Eye, EyeOff } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { AuthLayoutComponent } from '../components/auth-layout/auth-layout.component';
import type { LoginRequest } from '../../../core/models/auth.models';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, LucideAngularModule],
    providers: [{ provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider({ Eye, EyeOff }) }],
    templateUrl: './login.component.html',
    styleUrl: './login.component.css',
})
export class LoginComponent {
    private readonly fb = inject(FormBuilder);
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    readonly isLoading = signal(false);
    readonly errorMessage = signal<string | null>(null);
    readonly showPassword = signal(false);

    readonly form = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
    });

    togglePassword(): void {
        this.showPassword.update(v => !v);
    }

    onSubmit(): void {
        if (this.form.invalid || this.isLoading()) return;

        this.isLoading.set(true);
        this.errorMessage.set(null);

        const req = this.form.value as LoginRequest;

        this.auth.login(req).subscribe({
            next: () => {
                this.router.navigate(['/movies']);
            },
            error: (err: { error?: { message?: string } }) => {
                this.errorMessage.set(err?.error?.message ?? 'Login failed. Please try again.');
                this.isLoading.set(false);
            },
        });
    }
}
