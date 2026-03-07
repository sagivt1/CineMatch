import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MovieService } from '../../../core/services/movie.service';
import { Movie } from '../../../core/models/movie.models';
import { MovieRowComponent } from '../components/movie-row/movie-row.component';

@Component({
    selector: 'app-movie-detail',
    standalone: true,
    imports: [CommonModule, RouterLink, MovieRowComponent],
    templateUrl: './movie-detail.component.html',
    styleUrls: ['./movie-detail.component.css']
})
export class MovieDetailComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly movieService = inject(MovieService);

    // Signals for movie, loading, and error
    readonly movie = signal<Movie | null>(null);
    readonly loading = signal<boolean>(true);
    readonly error = signal<string | null>(null);

    // Derived signal: related movies based on primary genre
    readonly relatedMovies = computed(() => {
        const current = this.movie();
        if (!current) return [];
        const primaryGenre = current.genre[0];
        return this.movieService.movies()
            .filter(m => m.id !== current.id && m.genre.includes(primaryGenre))
            .slice(0, 10);
    });

    constructor() {
        // React to route param changes
        this.route.paramMap.subscribe(params => {
            const uuid = params.get('uuid');
            if (!uuid) {
                this.error.set('Invalid movie ID');
                this.loading.set(false);
                return;
            }
            this.fetchMovie(uuid);
        });
    }

    private fetchMovie(uuid: string): void {
        this.loading.set(true);
        this.error.set(null);

        // Try cached movie first
        const cached = this.movieService.getMovieFromState(uuid);
        if (cached) {
            this.movie.set(cached);
            this.loading.set(false);
            return;
        }

        // Fallback: API call
        this.movieService.getMovieByUUID(uuid).subscribe({
            next: (movie: Movie) => {
                this.movie.set(movie);
                this.loading.set(false);
            },
            error: (err: any) => {
                if (err instanceof HttpErrorResponse && err.status === 404) {
                    this.error.set('Movie not found. It might have been removed or the link is broken.');
                } else {
                    this.error.set('Failed to load movie details. Please try again later.');
                }
                this.loading.set(false);
                console.error('MovieDetailComponent error:', err);
            }
        });
    }
}