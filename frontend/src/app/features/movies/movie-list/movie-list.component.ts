import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MovieService } from '../../../core/services/movie.service';

@Component({
    selector: 'app-movie-list',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './movie-list.component.html',
    styleUrls: ['./movie-list.component.css']
})
export class MovieListComponent implements OnInit {
    private readonly movieService = inject(MovieService);

    readonly movies = this.movieService.movies;
    readonly loading = this.movieService.loading;
    readonly error = this.movieService.error;

    ngOnInit(): void {
        this.loadMovies();
    }

    retry(): void {
        this.loadMovies();
    }

    private loadMovies(): void {
        this.movieService.getMovies().subscribe({
            error: (err) => {
                console.error('Failed to load movies:', err);
            }
        });
    }
}
