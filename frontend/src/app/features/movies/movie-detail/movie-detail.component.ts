import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MovieService } from '../../../core/services/movie.service';
import { Movie } from '../../../core/models/movie.models';

@Component({
    selector: 'app-movie-detail',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './movie-detail.component.html',
    styleUrls: ['./movie-detail.component.css']
})
export class MovieDetailComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly movieService = inject(MovieService);

    readonly movie = signal<Movie | null>(null);
    readonly loading = signal<boolean>(true);
    readonly error = signal<string | null>(null);

    ngOnInit(): void {
        const uuid = this.route.snapshot.paramMap.get('uuid');
        if (uuid) {
            this.fetchMovie(uuid);
        } else {
            this.error.set('Invalid movie ID');
            this.loading.set(false);
        }
    }

    private fetchMovie(uuid: string): void {
        // Try state first
        const cachedMovie = this.movieService.getMovieFromState(uuid);
        if (cachedMovie) {
            this.movie.set(cachedMovie);
            this.loading.set(false);
            return;
        }

        // Fallback to API
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
