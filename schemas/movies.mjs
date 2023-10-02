import z from 'zod';

const movieSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string({
    invalid_type_error: 'Movie title must be a string chulo'
  }),
  year: z.number().int().positive().min(1920).max(2022),
  director: z.string(),
  duration: z.number().int().positive(),
  rate: z.number().min(0).max(10).optional(),
  poster: z.string().url(),
  genre: z.array(z.enum(['Action', 'Drama', 'Sci-Fi', 'Crime']))
});

const validateMovie = async movieObject => movieSchema.safeParseAsync(movieObject);
const validateMoviePartial = async movieObject => movieSchema.partial().safeParseAsync(movieObject);

export { validateMovie, validateMoviePartial };
