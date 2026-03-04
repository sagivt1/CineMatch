export interface Movie {
    id: string; // uuid
    title: string;
    description: string;
    posterUrl: string;
    releaseDate: string;
    rating: number;
    genre: string[];
    director: string;
    cast: string[];
    durationMinutes: number;
}

export interface MovieListResponse {
    movies: Movie[];
    total: number;
}
