import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { MovieListComponent } from './movie-list.component';
import { MovieService } from '../../../core/services/movie.service';
import { Movie } from '../../../core/models/movie.models';

describe('MovieListComponent', () => {
    let component: MovieListComponent;
    let fixture: ComponentFixture<MovieListComponent>;

    const mockMoviesVal: Movie[] = [
        { id: '1', title: 'Movie 1', description: 'Desc 1', posterUrl: 'img1.jpg', releaseDate: '2024-01-01', rating: 8, genre: ['Action'], director: 'Dir 1', cast: ['Cast 1'], durationMinutes: 120 },
        { id: '2', title: 'Movie 2', description: 'Desc 2', posterUrl: 'img2.jpg', releaseDate: '2023-01-01', rating: 7.5, genre: ['Comedy'], director: 'Dir 2', cast: ['Cast 2'], durationMinutes: 90 }
    ];

    const mockMovies = signal<Movie[]>([]);
    const mockLoading = signal<boolean>(false);
    const mockError = signal<string | null>(null);

    const mockMovieService = {
        movies: mockMovies.asReadonly(),
        loading: mockLoading.asReadonly(),
        error: mockError.asReadonly(),
        getMovies: vi.fn().mockReturnValue({ subscribe: () => { } })
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [MovieListComponent],
            providers: [
                provideRouter([]),
                { provide: MovieService, useValue: mockMovieService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(MovieListComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display skeleton loaders when loading is true', () => {
        mockLoading.set(true);
        mockMovies.set([]);
        mockError.set(null);
        fixture.detectChanges();

        const skeletons = fixture.debugElement.queryAll(By.css('.skeleton'));
        expect(skeletons.length).toBe(8); // Template has [1,2,3,4,5,6,7,8]
    });

    it('should display movie cards when data is available and not loading', () => {
        mockLoading.set(false);
        mockError.set(null);
        mockMovies.set(mockMoviesVal);
        fixture.detectChanges();

        const cards = fixture.debugElement.queryAll(By.css('.movie-card:not(.skeleton)'));
        expect(cards.length).toBe(2);

        const titleElement = cards[0].query(By.css('.movie-title')).nativeElement;
        expect(titleElement.textContent).toContain('Movie 1');
    });

    it('should navigate to movie details on click', () => {
        mockLoading.set(false);
        mockError.set(null);
        mockMovies.set(mockMoviesVal);
        fixture.detectChanges();

        const router = TestBed.inject(Router);
        const navigateSpy = vi.spyOn(router, 'navigateByUrl');

        const firstCard = fixture.debugElement.query(By.css('.movie-card:not(.skeleton)')).nativeElement;
        firstCard.click();

        expect(navigateSpy).toHaveBeenCalled();
    });

    it('should display empty state when movies array is empty and not loading', () => {
        mockLoading.set(false);
        mockError.set(null);
        mockMovies.set([]);
        fixture.detectChanges();

        const emptyState = fixture.debugElement.query(By.css('.empty-state'));
        expect(emptyState).toBeTruthy();
        expect(emptyState.nativeElement.textContent).toContain('No movies found');
    });

    it('should display error state when error is present and not loading', () => {
        mockLoading.set(false);
        mockError.set('Test Error');
        mockMovies.set([]);
        fixture.detectChanges();

        const errorState = fixture.debugElement.query(By.css('.error-state'));
        expect(errorState).toBeTruthy();
        expect(errorState.nativeElement.textContent).toContain('Test Error');
    });
});
