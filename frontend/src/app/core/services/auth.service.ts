import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import type {
    AuthResponse,
    AuthUser,
    ChangePasswordRequest,
    DeleteAccountRequest,
    LoginRequest,
    RegisterRequest,
    UpdateProfileRequest,
    UpdateProfileResponse,
} from '../models/auth.models';

const TOKEN_KEY = 'cm_access_token';
const API_BASE = '/CineMatch/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);

    // ── State ──────────────────────────────────────────────────────────────────
    private readonly _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
    private readonly _user = signal<AuthUser | null>(this.loadUser());

    /** Read-only token for the interceptor */
    readonly token = this._token.asReadonly();

    /** Derived boolean — components and guard use this */
    readonly isAuthenticated = computed(() => !!this._token());

    readonly currentUser = this._user.asReadonly();

    // ── Auth Actions ───────────────────────────────────────────────────────────

    login(req: LoginRequest) {
        return this.http.post<AuthResponse>(`${API_BASE}/login`, req).pipe(
            tap((res) => this.handleAuthResponse(res)),
        );
    }

    register(req: RegisterRequest) {
        return this.http.post<AuthResponse>(`${API_BASE}/register`, req).pipe(
            tap((res) => this.handleAuthResponse(res)),
        );
    }

    updateProfile(req: UpdateProfileRequest) {
        return this.http.patch<UpdateProfileResponse>(`${API_BASE}/me`, req).pipe(
            tap((res) => this.persistUser(this.toAuthUser(res.user))),
        );
    }

    changePassword(req: ChangePasswordRequest) {
        return this.http.post<void>(`${API_BASE}/change-password`, req);
    }

    deleteAccount(req: DeleteAccountRequest) {
        return this.http.delete<void>(`${API_BASE}/me`, { body: req }).pipe(
            tap(() => this.logout()),
        );
    }

    logout(): void {
        this._token.set(null);
        this._user.set(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('cm_user');
    }

    private loadUser(): AuthUser | null {
        try {
            const raw = localStorage.getItem('cm_user');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    // ── Private Helpers ────────────────────────────────────────────────────────

    /** Adapter: maps raw API response → internal domain model */
    private handleAuthResponse(res: AuthResponse): void {
        this._token.set(res.accessToken);
        localStorage.setItem(TOKEN_KEY, res.accessToken);
        this.persistUser(this.toAuthUser(res.user));
    }

    private persistUser(user: AuthUser): void {
        this._user.set(user);
        localStorage.setItem('cm_user', JSON.stringify(user));
    }

    private toAuthUser(user: AuthResponse['user']): AuthUser {
        return {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
        };
    }
}
