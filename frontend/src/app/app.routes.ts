import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: '/login',
        pathMatch: 'full',
    },
    {
        path: 'login',
        loadComponent: () =>
            import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    },
    {
        path: 'register',
        loadComponent: () =>
            import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
    },
    {
        path: 'movies',
        loadComponent: () =>
            import('./features/movies/movie-list/movie-list.component').then((m) => m.MovieListComponent),
        canActivate: [authGuard],
    },
    {
        path: 'movies/:uuid',
        loadComponent: () =>
            import('./features/movies/movie-detail/movie-detail.component').then((m) => m.MovieDetailComponent),
        canActivate: [authGuard],
    },
    {
        path: 'dashboard',
        loadComponent: () =>
            import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        canActivate: [authGuard],
    },
    {
        path: '**',
        redirectTo: '/login',
    },
];
