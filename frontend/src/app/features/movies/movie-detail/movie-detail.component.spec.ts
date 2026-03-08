import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { provideRouter, ActivatedRoute } from '@angular/router';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { of, throwError, Subject } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { MovieDetailComponent } from './movie-detail.component';
import { MovieService } from '../../../core/services/movie.service';
import { Movie } from '../../../core/models/movie.models';

describe('MovieDetailComponent', () => {
    let component: MovieDetailComponent;
    let fixture: ComponentFixture<MovieDetailComponent>;
    let mockMovieService: any;
    let mockActivatedRoute: any;

    const mockMovie: Movie = {
        id: '123',
        title: 'Detail Movie',
        description: 'Detail Desc',
        posterUrl: 'detail.jpg',
        releaseDate: '2024-01-01',
        rating: 9.5,
        genre: ['Sci-Fi'],
        director: 'Detail Dir',
        cast: ['Actor 1'],
        durationMinutes: 150
    };

    beforeEach(async () => {
        mockMovieService = {
            getMovieFromState: vi.fn().mockReturnValue(undefined),
            getMovieByUUID: vi.fn().mockReturnValue(of(mockMovie))
        };

        mockActivatedRoute = {
            snapshot: {
                paramMap: {
                    get: vi.fn().mockReturnValue('123')
                }
            }
        };

        await TestBed.configureTestingModule({
            imports: [MovieDetailComponent],
            providers: [
                provideRouter([]),
                { provide: MovieService, useValue: mockMovieService },
                { provide: ActivatedRoute, useValue: mockActivatedRoute }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(MovieDetailComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('should display loading state initially', () => {
        const pendingSubject = new Subject<Movie>();
        mockMovieService.getMovieByUUID.mockReturnValue(pendingSubject.asObservable());

        fixture.detectChanges();

        const loader = fixture.debugElement.query(By.css('.loading-state'));
        expect(loader).toBeTruthy();
        expect(loader.nativeElement.textContent).toContain('Loading movie details');
    });

    it('should fetch movie data and display details', () => {
        fixture.detectChanges(); // Triggers ngOnInit

        expect(mockMovieService.getMovieByUUID).toHaveBeenCalledWith('123');
        expect(component.loading()).toBe(false);
        expect(component.movie()).toEqual(mockMovie);

        const title = fixture.debugElement.query(By.css('h1.title'));
        expect(title.nativeElement.textContent).toContain('Detail Movie');

        const rating = fixture.debugElement.query(By.css('.rating'));
        expect(rating.nativeElement.textContent).toContain('9.5');
    });

    it('should navigate back to the movie list correctly', () => {
        fixture.detectChanges();

        const backLink = fixture.debugElement.query(By.css('.back-link'));
        expect(backLink.attributes['routerLink']).toBe('/movies');
    });

    it('should display a specific 404 error if API returns 404', () => {
        const errorResponse = new HttpErrorResponse({ status: 404 });
        mockMovieService.getMovieByUUID.mockReturnValue(throwError(() => errorResponse));

        fixture.detectChanges(); // Triggers ngOnInit

        expect(component.loading()).toBe(false);
        expect(component.error()).toContain('Movie not found');

        const errorDisplay = fixture.debugElement.query(By.css('.error-state .error-message'));
        expect(errorDisplay.nativeElement.textContent).toContain('Movie not found');
    });

    it('should display an invalid ID error if no UUID is in route', () => {
        mockActivatedRoute.snapshot.paramMap.get.mockReturnValue(null);

        fixture = TestBed.createComponent(MovieDetailComponent);
        component = fixture.componentInstance;
        fixture.detectChanges(); // Triggers ngOnInit

        expect(component.loading()).toBe(false);
        expect(component.error()).toBe('Invalid movie ID');
    });
});
