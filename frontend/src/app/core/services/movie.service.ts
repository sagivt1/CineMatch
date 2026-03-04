import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';
import { Movie, MovieListResponse } from '../models/movie.models';

@Injectable({
    providedIn: 'root',
})
export class MovieService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = '/api/v1/movies';

    private readonly MOCK_MOVIES: Movie[] = [
        {
            id: '550e8400-e29b-41d4-a716-446655440000',
            title: 'Inception',
            description: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
            posterUrl: 'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_FMjpg_UY711_.jpg',
            releaseDate: '2010-07-16',
            rating: 8.8,
            genre: ['Action', 'Sci-Fi', 'Thriller'],
            director: 'Christopher Nolan',
            cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page'],
            durationMinutes: 148
        },
        {
            id: '7c9e6679-7429-4286-9a22-b0a6d05fb521',
            title: 'Interstellar',
            description: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
            posterUrl: 'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_FMjpg_UY711_.jpg',
            releaseDate: '2014-11-07',
            rating: 8.7,
            genre: ['Adventure', 'Drama', 'Sci-Fi'],
            director: 'Christopher Nolan',
            cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain'],
            durationMinutes: 169
        },
        {
            id: '9f8b7e6d-5c4a-3b2a-1a09-876543210fed',
            title: 'The Dark Knight',
            description: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
            posterUrl: 'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_FMjpg_UY711_.jpg',
            releaseDate: '2008-07-18',
            rating: 9.0,
            genre: ['Action', 'Crime', 'Drama'],
            director: 'Christopher Nolan',
            cast: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart'],
            durationMinutes: 152
        }
    ];

    // State
    private readonly _movies = signal<Movie[]>([]);
    private readonly _loading = signal<boolean>(false);
    private readonly _error = signal<string | null>(null);

    // Public Signals
    readonly movies = computed(() => this._movies());
    readonly loading = computed(() => this._loading());
    readonly error = computed(() => this._error());

    getMovies(): Observable<MovieListResponse> {
        // Prevent redundant calls if we already have data and are NOT forcibly refreshing
        if (this._movies().length > 0 && !this._loading()) {
            return of({ movies: this._movies(), total: this._movies().length });
        }

        // Prevent concurrent identical requests
        if (this._loading()) {
            return of({ movies: this._movies(), total: this._movies().length });
        }

        return this.refreshMovies();
    }

    refreshMovies(): Observable<MovieListResponse> {
        this._loading.set(true);
        this._error.set(null);

        return this.http.get<MovieListResponse>(this.apiUrl).pipe(
            tap((response) => {
                this._movies.set(response.movies);
                this._loading.set(false);
            }),
            catchError((err) => {
                console.warn('MovieService.refreshMovies API failed (likely backend is down), using mock data.', err);
                this._movies.set(this.MOCK_MOVIES);
                this._loading.set(false);
                return of({ movies: this.MOCK_MOVIES, total: this.MOCK_MOVIES.length });
            })
        );
    }

    getMovieByUUID(uuid: string): Observable<Movie> {
        // Check local state first to prevent redundant API call
        const cachedMovie = this.getMovieFromState(uuid);
        if (cachedMovie) {
            return of(cachedMovie);
        }

        return this.http.get<Movie>(`${this.apiUrl}/${uuid}`).pipe(
            catchError((err) => {
                console.warn(`MovieService.getMovieByUUID API failed for ${uuid}.`, err);
                throw err;
            })
        );
    }

    // Helper to find movie in state without network call if possible
    getMovieFromState(uuid: string): Movie | undefined {
        return this._movies().find((m) => m.id === uuid);
    }
}
