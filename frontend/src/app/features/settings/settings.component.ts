import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, WritableSignal, effect, inject, signal } from '@angular/core';
import {
    AbstractControl,
    FormBuilder,
    ReactiveFormsModule,
    ValidationErrors,
    ValidatorFn,
    Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import type { ChangePasswordRequest, DeleteAccountRequest, UpdateProfileRequest } from '../../core/models/auth.models';

const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const newPassword = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');

    if (!newPassword || !confirmPassword) {
        return null;
    }

    return newPassword.value === confirmPassword.value ? null : { passwordMismatch: true };
};

type FeedbackState = {
    type: 'success' | 'error';
    message: string;
};

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './settings.component.html',
    styleUrl: './settings.component.css',
})
export class SettingsComponent implements OnInit, OnDestroy {
    private readonly auth = inject(AuthService);
    private readonly fb = inject(FormBuilder);
    private readonly router = inject(Router);
    private readonly revealTimers: ReturnType<typeof setTimeout>[] = [];

    readonly currentUser = this.auth.currentUser;

    readonly showHero = signal(false);
    readonly showProfileCard = signal(false);
    readonly showPasswordCard = signal(false);
    readonly showDangerCard = signal(false);

    readonly isProfileSaving = signal(false);
    readonly isPasswordSaving = signal(false);
    readonly isDeleting = signal(false);
    readonly isDeleteConfirming = signal(false);

    readonly profileFeedback = signal<FeedbackState | null>(null);
    readonly passwordFeedback = signal<FeedbackState | null>(null);
    readonly deleteFeedback = signal<FeedbackState | null>(null);

    readonly profileForm = this.fb.group({
        displayName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
        email: [{ value: '', disabled: true }],
    });

    readonly passwordForm = this.fb.group(
        {
            oldPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
            newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
            confirmPassword: ['', Validators.required],
        },
        { validators: passwordMatchValidator },
    );

    readonly deleteForm = this.fb.group({
        password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    });

    constructor() {
        effect(() => {
            const user = this.currentUser();
            if (!user) {
                return;
            }

            this.profileForm.controls.email.setValue(user.email, { emitEvent: false });

            if (!this.profileForm.dirty) {
                this.profileForm.controls.displayName.setValue(user.displayName, { emitEvent: false });
            }
        });
    }

    ngOnInit(): void {
        this.scheduleReveal(this.showHero, 50);
        this.scheduleReveal(this.showProfileCard, 140);
        this.scheduleReveal(this.showPasswordCard, 230);
        this.scheduleReveal(this.showDangerCard, 320);
    }

    ngOnDestroy(): void {
        for (const timer of this.revealTimers) {
            clearTimeout(timer);
        }
    }

    saveProfile(): void {
        if (this.profileForm.invalid || this.isProfileSaving()) {
            this.profileForm.markAllAsTouched();
            return;
        }

        const displayName = this.profileForm.controls.displayName.value?.trim() ?? '';
        const currentDisplayName = this.currentUser()?.displayName ?? '';

        if (displayName === currentDisplayName) {
            this.profileFeedback.set({ type: 'success', message: 'Display name is already up to date.' });
            return;
        }

        this.isProfileSaving.set(true);
        this.profileFeedback.set(null);

        const req: UpdateProfileRequest = { displayName };

        this.auth.updateProfile(req).subscribe({
            next: () => {
                this.profileForm.controls.displayName.setValue(displayName, { emitEvent: false });
                this.profileForm.markAsPristine();
                this.profileFeedback.set({ type: 'success', message: 'Profile updated successfully.' });
                this.isProfileSaving.set(false);
            },
            error: (err: { error?: { message?: string } }) => {
                this.profileFeedback.set({
                    type: 'error',
                    message: err?.error?.message ?? 'Unable to update your profile right now.',
                });
                this.isProfileSaving.set(false);
            },
        });
    }

    updatePassword(): void {
        if (this.passwordForm.invalid || this.isPasswordSaving()) {
            this.passwordForm.markAllAsTouched();
            return;
        }

        this.isPasswordSaving.set(true);
        this.passwordFeedback.set(null);

        const req: ChangePasswordRequest = {
            oldPassword: this.passwordForm.controls.oldPassword.value ?? '',
            newPassword: this.passwordForm.controls.newPassword.value ?? '',
        };

        this.auth.changePassword(req).subscribe({
            next: () => {
                this.passwordForm.reset();
                this.passwordFeedback.set({ type: 'success', message: 'Password updated successfully.' });
                this.isPasswordSaving.set(false);
            },
            error: (err: { error?: { message?: string } }) => {
                this.passwordFeedback.set({
                    type: 'error',
                    message: err?.error?.message ?? 'Unable to update your password right now.',
                });
                this.isPasswordSaving.set(false);
            },
        });
    }

    revealDeleteConfirmation(): void {
        this.isDeleteConfirming.set(true);
        this.deleteFeedback.set(null);
    }

    cancelDeleteConfirmation(): void {
        this.isDeleteConfirming.set(false);
        this.deleteFeedback.set(null);
        this.deleteForm.reset();
    }

    deleteAccount(): void {
        if (this.deleteForm.invalid || this.isDeleting()) {
            this.deleteForm.markAllAsTouched();
            return;
        }

        this.isDeleting.set(true);
        this.deleteFeedback.set(null);

        const req: DeleteAccountRequest = {
            password: this.deleteForm.controls.password.value ?? '',
        };

        this.auth.deleteAccount(req).subscribe({
            next: () => {
                this.isDeleting.set(false);
                void this.router.navigate(['/']);
            },
            error: (err: { error?: { message?: string } }) => {
                this.deleteFeedback.set({
                    type: 'error',
                    message: err?.error?.message ?? 'Unable to delete your account right now.',
                });
                this.isDeleting.set(false);
            },
        });
    }

    private scheduleReveal(state: WritableSignal<boolean>, delayMs: number): void {
        const timer = setTimeout(() => state.set(true), delayMs);
        this.revealTimers.push(timer);
    }
}
