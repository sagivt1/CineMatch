import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MovieService } from '../../../core/services/movie.service';
import { Movie } from '../../../core/models/movie.models';

@Component({
    selector: 'app-movie-list',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './movie-list.component.html',
    styleUrls: ['./movie-list.component.css']
})
export class MovieListComponent implements OnInit, OnDestroy {
    private readonly movieService = inject(MovieService);
    private carouselTimer: ReturnType<typeof setInterval> | null = null;
    private fadeTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly slideDelayMs = 4500;
    private readonly fadeDurationMs = 450;

    readonly movies = this.movieService.movies;
    readonly loading = this.movieService.loading;
    readonly error = this.movieService.error;
    readonly heroIndex = signal(0);
    readonly isHeroFading = signal(false);

    readonly heroMovies = computed(() => this.movies().slice(0, 6));
    readonly heroMovie = computed(() => {
        const heroes = this.heroMovies();
        if (heroes.length === 0) {
            return null;
        }

        return heroes[this.heroIndex() % heroes.length];
    });
    readonly recommendedMovies = computed(() => this.movies().slice(0, 8));
    readonly topMatches = computed(() => this.movies().slice(1, 7));
    readonly continueWatching = computed(() => this.movies().slice(2, 6));

    ngOnInit(): void {
        this.loadMovies();
        this.startHeroCarousel();
    }

    ngOnDestroy(): void {
        this.stopHeroCarousel();
    }

    retry(): void {
        this.loadMovies();
    }

    getYear(movie: Movie): string {
        return new Date(movie.releaseDate).getFullYear().toString();
    }

    getGenres(movie: Movie): string {
        return movie.genre.slice(0, 2).join(' • ');
    }

    getProgress(index: number): number {
        const progressMap = [65, 20, 90, 42];
        return progressMap[index % progressMap.length];
    }

    private loadMovies(): void {
        this.movieService.getMovies().subscribe({
            error: (err) => {
                console.error('Failed to load movies:', err);
            }
        });
    }

    private startHeroCarousel(): void {
        this.stopHeroCarousel();

        this.carouselTimer = setInterval(() => {
            this.advanceHero();
        }, this.slideDelayMs);
    }

    private stopHeroCarousel(): void {
        if (this.carouselTimer) {
            clearInterval(this.carouselTimer);
            this.carouselTimer = null;
        }

        if (this.fadeTimer) {
            clearTimeout(this.fadeTimer);
            this.fadeTimer = null;
        }
    }

    private advanceHero(): void {
        const heroes = this.heroMovies();
        if (heroes.length < 2 || this.isHeroFading()) {
            return;
        }

        this.isHeroFading.set(true);
        this.fadeTimer = setTimeout(() => {
            this.heroIndex.update((index) => (index + 1) % heroes.length);
            this.isHeroFading.set(false);
        }, this.fadeDurationMs);
    }
}
