import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MovieService } from '../../../core/services/movie.service';
import { ScrollRevealDirective } from '../directives/scroll-reveal.directive';

@Component({
    selector: 'app-home-hero',
    standalone: true,
    imports: [RouterLink, ScrollRevealDirective],
    templateUrl: './home-hero.component.html',
    styleUrls: ['./home-hero.component.css']
})
export class HomeHeroComponent implements OnInit {
    private readonly movieService = inject(MovieService);

    readonly movies = this.movieService.movies;
    readonly trendingMovies = computed(() => this.movies().slice(0, 8));

    ngOnInit(): void {
        this.movieService.getMovies().subscribe({
            error: (err) => {
                console.error('Failed to load home trending movies:', err);
            }
        });
    }
}
