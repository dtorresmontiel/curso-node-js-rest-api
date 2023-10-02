import express from 'express';
import process from 'node:process';
import crypto from 'node:crypto';
import cors from 'cors';
import { findAll, findById, findByCollectionField, insertNew, persistEntry, deleteEntryById } from './json-data-loader.mjs';
import { validateMovie } from './schemas/movies.mjs';

const app = express().disable('x-powered-by').use(express.json());

const ALLOWED_CORS_ORIGINS = ['http://localhost:8080'];

// DIY CORS middleware (POST/PUT/DELETE use CORS Pre-flight OPTIONS)
app.use((req, res, next) => {
  // self-domain req does not send "origin"
  if (req.origin && ALLOWED_CORS_ORIGINS.includes(req.origin)) {
    res.header('Access-Control-Allow-Origin', req.origin);
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE');
  }
  next();
});

// CORS middleware (non DIY)
app.use(cors({ origin: ALLOWED_CORS_ORIGINS, methods: ['GET', 'POST', 'PUT', 'PATH', 'DELETE'] }));

// CORS middleware with specific config for a route (non DIY)
app.use('/movies', cors({ origin: ALLOWED_CORS_ORIGINS, methods: ['GET', 'POST'] }));

// CORS middleware (non DIY) Custom CORS handler
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowd by CORS'));
  }
}));

const moviesDataFile = './data/movies.json';

app.get('/', (req, res) => {
  res.json({ greetings: 'Hellow World!' });
});

app.post('/movies', (req, res) => {
  validateMovie(req.body)
    .then(validated => {
      if (validated.error) { res.status(400).json({ error: validated.error }); }
      return validated.data;
    })
    .then(validatedData => insertNew({ ...validatedData, id: crypto.randomUUID() }, moviesDataFile))
    .then(newMovie => {
      res.status(201).json(newMovie);
    })
    .catch(error => {
      switch (error.message) {
        case 'duplicate_entry': res.status(409).send(`Movie already exists (${req.body.title}), cannot be added.`); break;
        default: res.status(500).send(error.message);
      }
    });
});

app.get('/movies', (req, res) => {
  const { genre } = req.query;
  return genre
    ? findByCollectionField('genre', genre, moviesDataFile)
      .then(data => res.json(data))
      .catch(error => {
        switch (error.message) {
          case 'not_found': res.status(404).send(`Movies not found for genre(${genre})`); break;
          default: res.status(500).send(error.message);
        }
      })
    : findAll(moviesDataFile)
      .then(data => res.json(data))
      .catch(error => { res.status(500).send(error.message); });
});

app.get('/movies/:id', (req, res) => {
  const { id } = req.params;
  findById(id, moviesDataFile)
    .then(data => res.json(data))
    .catch(error => {
      switch (error.message) {
        case 'not_found': res.status(404).send(`Movie not found for ID(${id})`); break;
        default: res.status(500).send(error.message);
      }
    });
});

app.patch('/movies/:id', (req, res) => {
  const { id } = req.params;
  findById(id, moviesDataFile)
    .then(movieData => ({ ...movieData, ...req.body, id }))
    .then(async movieData => {
      return validateMovie(movieData).then(validated => {
        if (validated.error) { res.status(400).json({ error: validated.error }); }
        return validated.data;
      });
    })
    .then(validatedData => persistEntry(validatedData, moviesDataFile))
    .then(persistedData => { res.status(202).json(persistedData); })
    .catch(error => {
      switch (error.message) {
        case 'not_found': res.status(404).send(`Movie not found for ID(${id}). Cannot UPDATE.`); break;
        default: res.status(500).send(error.message);
      }
    });
});

app.delete('/movies/:id', (req, res) => {
  const { id } = req.params;
  findById(id, moviesDataFile)
    .then(() => deleteEntryById(id, moviesDataFile))
    .then(() => { res.status(204).end(); })
    .catch(error => {
      switch (error.message) {
        case 'not_found': res.status(404).send(`Movie not found for ID(${id}). Cannot DELETE.`); break;
        default: res.status(500).send(error.message);
      }
    });
});

// Bind app and start listening
const PORT = process.env.PORT ?? 1234;
const SELF_URL = `http://localhost:${PORT}`;

app.listen(PORT, () => {
  console.log(`Server listening on ${SELF_URL}`);
});
