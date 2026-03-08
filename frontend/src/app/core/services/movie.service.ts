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
            title: 'Dune: Part Two',
            description: 'Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.',
            posterUrl: 'https://www.themoviedb.org/t/p/w1280/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
            backdropUrl: 'https://media.themoviedb.org/t/p/w1920_and_h800_multi_faces/ylkdrn23p3gQcHx7ukIfuy2CkTE.jpg',
            releaseDate: '2024-03-01',
            rating: 8.9,
            genre: ['Action', 'Adventure', 'Sci-Fi'],
            director: 'Denis Villeneuve',
            cast: ['Timothée Chalamet', 'Zendaya'],
            durationMinutes: 166
        },
        {
            id: '7c9e6639-74d5-40b5-938d-ca0d81d77e91',
            title: 'Blade Runner 2049',
            description: 'A young Blade Runner\'s discovery of a long-buried secret leads him to track down former Blade Runner Rick Deckard.',
            posterUrl: 'https://www.themoviedb.org/t/p/w1280/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
            backdropUrl: 'https://media.themoviedb.org/t/p/w1920_and_h800_multi_faces/askFH4GSk2u9z3ZE5ypdKIMeqLJ.jpg',
            releaseDate: '2017-10-06',
            rating: 8.0,
            genre: ['Sci-Fi', 'Drama', 'Mystery'],
            director: 'Denis Villeneuve',
            cast: ['Ryan Gosling', 'Harrison Ford'],
            durationMinutes: 164
        },
        {
            id: 'a8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d',
            title: 'Oppenheimer',
            description: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
            posterUrl: 'https://www.themoviedb.org/t/p/w1280/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
            backdropUrl: 'https://media.themoviedb.org/t/p/w1920_and_h800_multi_faces/ycnO0cjsAROSGJKuMODgRtWsHQw.jpg',
            releaseDate: '2023-07-21',
            rating: 8.4,
            genre: ['Biography', 'Drama', 'History'],
            director: 'Christopher Nolan',
            cast: ['Cillian Murphy', 'Emily Blunt'],
            durationMinutes: 180
        },
        {
            id: '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e',
            title: 'Interstellar',
            description: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
            posterUrl: 'https://www.themoviedb.org/t/p/w1280/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
            backdropUrl: 'https://media.themoviedb.org/t/p/w1920_and_h800_multi_faces/2ssWTSVklAEc98frZUQhgtGHx7s.jpg',
            releaseDate: '2014-11-07',
            rating: 8.7,
            genre: ['Adventure', 'Drama', 'Sci-Fi'],
            director: 'Christopher Nolan',
            cast: ['Matthew McConaughey', 'Anne Hathaway'],
            durationMinutes: 169
        },
        {
            id: '1a2b3c4d-5e6f-7080-90a0-b0c0d0e0f010',
            title: 'John Wick: Chapter 4',
            description: 'John Wick uncovers a path to defeating The High Table.',
            posterUrl: 'https://www.themoviedb.org/t/p/w1280/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg',
            backdropUrl: 'https://media.themoviedb.org/t/p/w1920_and_h800_multi_faces/7I6VUdPj6tQECNHdviJkUHD2u89.jpg',
            releaseDate: '2023-03-24',
            rating: 7.7,
            genre: ['Action', 'Crime', 'Thriller'],
            director: 'Chad Stahelski',
            cast: ['Keanu Reeves', 'Donnie Yen'],
            durationMinutes: 169
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
                console.warn(`MovieService.getMovieByUUID API failed for ${uuid}. Checking mock data.`, err);
                // Deep-linking fix: If API fails (on refresh), check MOCK_MOVIES
                const mockMovie = this.MOCK_MOVIES.find(m => m.id === uuid);
                if (mockMovie) return of(mockMovie);

                throw err;
            })
        );
    }

    // Helper to find movie in state without network call if possible
    getMovieFromState(uuid: string): Movie | undefined {
        return this._movies().find((m) => m.id === uuid);
    }
}
