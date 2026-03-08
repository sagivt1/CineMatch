import { Component, inject, signal } from '@angular/core';
import {
    AbstractControl,
    FormBuilder,
    ReactiveFormsModule,
    ValidationErrors,
    ValidatorFn,
    Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, LucideIconProvider, LUCIDE_ICONS, Eye, EyeOff } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { AuthLayoutComponent } from '../components/auth-layout/auth-layout.component';
import type { RegisterRequest } from '../../../core/models/auth.models';

const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password');
    const confirm = control.get('confirmPassword');
    if (!password || !confirm) return null;
    return password.value === confirm.value ? null : { passwordMismatch: true };
};

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, LucideAngularModule],
    providers: [{ provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider({ Eye, EyeOff }) }],
    templateUrl: './register.component.html',
    styleUrl: './register.component.css',
})
export class RegisterComponent {
    private readonly fb = inject(FormBuilder);
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    readonly isLoading = signal(false);
    readonly errorMessage = signal<string | null>(null);
    readonly showPassword = signal(false);
    readonly showConfirmPassword = signal(false);

    readonly form = this.fb.group(
        {
            displayName: ['', [Validators.required, Validators.minLength(2)]],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', Validators.required],
        },
        { validators: passwordMatchValidator },
    );

    togglePassword(): void {
        this.showPassword.update(v => !v);
    }

    toggleConfirmPassword(): void {
        this.showConfirmPassword.update(v => !v);
    }

    onSubmit(): void {
        if (this.form.invalid || this.isLoading()) return;

        this.isLoading.set(true);
        this.errorMessage.set(null);

        const { displayName, email, password } = this.form.value;
        const req: RegisterRequest = { displayName: displayName!, email: email!, password: password! };

        this.auth.register(req).subscribe({
            next: () => {
                this.router.navigate(['/movies']);
            },
            error: (err: { error?: { message?: string } }) => {
                this.errorMessage.set(err?.error?.message ?? 'Registration failed. Please try again.');
                this.isLoading.set(false);
            },
        });
    }
}
