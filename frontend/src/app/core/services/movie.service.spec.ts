import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { MovieService } from './movie.service';
import { Movie, MovieListResponse } from '../models/movie.models';

describe('MovieService', () => {
    let service: MovieService;
    let httpTestingController: HttpTestingController;

    const mockMovies: Movie[] = [
        {
            id: '1',
            title: 'Test Movie 1',
            description: 'Desc 1',
            posterUrl: 'url1',
            releaseDate: '2024-01-01',
            rating: 8.0,
            genre: ['Action'],
            director: 'Dir 1',
            cast: ['Cast 1'],
            durationMinutes: 120,
        },
        {
            id: '2',
            title: 'Test Movie 2',
            description: 'Desc 2',
            posterUrl: 'url2',
            releaseDate: '2024-02-01',
            rating: 7.0,
            genre: ['Drama'],
            director: 'Dir 2',
            cast: ['Cast 2'],
            durationMinutes: 90,
        },
    ];

    const mockResponse: MovieListResponse = {
        movies: mockMovies,
        total: 2,
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                MovieService,
                provideHttpClient(),
                provideHttpClientTesting(), // Modern API for HttpTestingController
            ],
        });
        service = TestBed.inject(MovieService);
        httpTestingController = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpTestingController.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('refreshMovies()', () => {
        it('should fetch movies from the API and update state', () => {
            // Initial state
            expect(service.loading()).toBe(false);
            expect(service.movies()).toEqual([]);

            // Trigger request
            service.refreshMovies().subscribe((res) => {
                expect(res).toEqual(mockResponse);
            });

            // Expect request and flush response
            const req = httpTestingController.expectOne('/api/v1/movies');
            expect(req.request.method).toBe('GET');
            expect(service.loading()).toBe(true); // Should be loading while request is pending

            req.flush(mockResponse);

            // Final state
            expect(service.movies()).toEqual(mockMovies);
            expect(service.loading()).toBe(false);
        });

        it('should use MOCK_MOVIES fallback if the API fails', () => {
            // We need to access the private MOCK_MOVIES for comparison, or loosely match
            // But we know it has 3 movies from the implementation.

            service.refreshMovies().subscribe((res) => {
                expect(res.movies.length).toBeGreaterThan(0);
                expect(res.movies[0].title).toBe('Inception'); // Known from MOCK_MOVIES
            });

            const req = httpTestingController.expectOne('/api/v1/movies');
            req.error(new ProgressEvent('Network error')); // Simulate failure

            expect(service.movies().length).toBeGreaterThan(0);
            expect(service.loading()).toBe(false);
        });
    });

    describe('getMovies()', () => {
        it('should fetch from API if state is empty', () => {
            service.getMovies().subscribe();

            const req = httpTestingController.expectOne('/api/v1/movies');
            req.flush(mockResponse);
        });

        it('should return cached data and NOT fetch from API if state is populated', () => {
            // Pre-populate state
            (service as any)._movies.set(mockMovies); // Accessing private signal for testing

            service.getMovies().subscribe((res) => {
                expect(res.movies).toEqual(mockMovies);
            });

            httpTestingController.expectNone('/api/v1/movies');
        });

        it('should NOT fetch from API if already loading', () => {
            (service as any)._loading.set(true); // Access private signal to simulate pending request

            let emitCount = 0;
            service.getMovies().subscribe(() => {
                emitCount++;
            });

            httpTestingController.expectNone('/api/v1/movies');

            // Should emit cached movies immediately (which is [] in this case)
            expect(emitCount).toBe(1);
        });
    });

    describe('getMovieByUUID()', () => {
        it('should fetch a single movie from API if not in local cache', () => {
            const requestedId = '123-abc';
            const mockSingleMovie: Movie = { ...mockMovies[0], id: requestedId };

            service.getMovieByUUID(requestedId).subscribe((movie) => {
                expect(movie).toEqual(mockSingleMovie);
            });

            const req = httpTestingController.expectOne(`/api/v1/movies/${requestedId}`);
            expect(req.request.method).toBe('GET');
            req.flush(mockSingleMovie);
        });

        it('should return immediately from local cache if available', () => {
            const requestedId = '1';
            (service as any)._movies.set(mockMovies); // Pre-populate cache

            service.getMovieByUUID(requestedId).subscribe((movie) => {
                expect(movie).toEqual(mockMovies[0]);
            });

            httpTestingController.expectNone(`/api/v1/movies/${requestedId}`);
        });

        it('should throw an error if API call fails for a single movie', () => {
            const requestedId = 'missing-id';

            service.getMovieByUUID(requestedId).subscribe({
                next: () => { throw new Error('Expected an error observable'); },
                error: (err) => {
                    expect(err.status).toBe(404);
                }
            });

            const req = httpTestingController.expectOne(`/api/v1/movies/${requestedId}`);
            req.flush('Not Found', { status: 404, statusText: 'Not Found' });
        });
    });
});
