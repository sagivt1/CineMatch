import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import type { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from '../models/auth.models';

const TOKEN_KEY = 'cm_access_token';
const API_BASE = '/api/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);

    // ── State ──────────────────────────────────────────────────────────────────
    private readonly _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
    private readonly _user = signal<AuthUser | null>(null);

    /** Read-only token for the interceptor */
    readonly token = this._token.asReadonly();

    /** Derived boolean — components and guard use this */
    readonly isAuthenticated = computed(() => !!this._token());

    readonly currentUser = this._user.asReadonly();

    // ── Auth Actions ───────────────────────────────────────────────────────────

    login(req: LoginRequest): Observable<AuthResponse> {
        // Mock Login for development
        if (req.email === 'demo@cinematch.ai' && req.password === 'password123') {
            const mockResponse: AuthResponse = {
                accessToken: 'mock_token_' + Date.now(),
                user: {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    email: 'demo@cinematch.ai',
                    displayName: 'Demo User',
                },
            };
            return new Observable<AuthResponse>((subscriber) => {
                this.handleAuthResponse(mockResponse);
                subscriber.next(mockResponse);
                subscriber.complete();
            });
        }

        return this.http.post<AuthResponse>(`${API_BASE}/login`, req).pipe(
            tap((res) => this.handleAuthResponse(res)),
        );
    }

    register(req: RegisterRequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${API_BASE}/register`, req).pipe(
            tap((res) => this.handleAuthResponse(res)),
        );
    }

    logout(): void {
        this._token.set(null);
        this._user.set(null);
        localStorage.removeItem(TOKEN_KEY);
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
    }
}
