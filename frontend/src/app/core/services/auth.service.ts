import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import type { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from '../models/auth.models';

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
        const user: AuthUser = {
            id: res.user.id,
            email: res.user.email,
            displayName: res.user.displayName,
        };
        this._token.set(res.accessToken);
        this._user.set(user);

        localStorage.setItem(TOKEN_KEY, res.accessToken);
        localStorage.setItem('cm_user', JSON.stringify(user));
    }
}
