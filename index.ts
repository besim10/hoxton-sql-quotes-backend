import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
const PORT = 8000;

const db = new Database('./data.db', {
  verbose: console.log,
});

const app = express();
app.use(express.json());
app.use(cors());

const getAllQuotes = db.prepare(`SELECT * FROM quotes;`);

const getQuotesBySearch = db.prepare(
  `SELECT * FROM quotes WHERE text LIKE '%?%';`
);
const getQuoteById = db.prepare(`SELECT * FROM quotes WHERE id=?;`);

const createQuote = db.prepare(`
INSERT INTO quotes
(firstName, lastName, photo, age, text, likes)
VALUES
(?,?,?,?,?,0);
`);

app.get('/', function (req, res) {
  res.send('Welcome to our Quotes API');
});
app.get('/quotes', (req, res) => {
  // search here is a *query*
  const search = req.query.search;

  let quotesToSend = getAllQuotes.all();

  //   if (typeof search === 'string') {
  //     console.log('Filtering quotes with search:', search);
  //     quotesToSend = getQuotesBySearch.all(search);
  //   }
  res.send(quotesToSend);
});
app.get('/quotes/:id', (req, res) => {
  const id = req.params.id;
  const result = getQuoteById.get(id);

  if (result) {
    res.send(result);
  } else {
    res.status(404).send({ error: 'Quote not found.' });
  }
});
const getRandomQuote = db.prepare(`
SELECT * 
FROM quotes
LIMIT 1 
OFFSET ABS(RANDOM()) % MAX((SELECT COUNT(*) FROM quotes), 1)`);

app.get('/random', (req, res) => {
  //   const randomNumber = Math.floor(Math.random() * getAllQuotes.get().length);
  //   const randomQuote = getAllQuotes.get()[randomNumber];
  const result = getRandomQuote.get();
  res.send(result);
});

const randomQuote = getRandomQuote.get();
app.get('/quote-of-the-day', (req, res) => {
  res.send(randomQuote);
});

app.post('/quotes', (req, res) => {
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const photo = req.body.photo;
  const age = Number(req.body.age);
  const text = req.body.text;

  const errors = [];

  if (typeof firstName !== 'string') {
    errors.push(`First Name missing or not a string.`);
  }

  if (typeof lastName !== 'string') {
    errors.push(`Last Name missing or not a string.`);
  }
  if (typeof photo !== 'string') {
    errors.push(`Photo missing or not a string.`);
  }
  if (typeof age !== 'number') {
    errors.push(`Age missing or not a number.`);
  }
  if (typeof text !== 'string') {
    errors.push(`Text missing or not a string.`);
  }

  if (errors.length === 0) {
    const result = createQuote.run(firstName, lastName, photo, age, text);
    const newQuote = getQuoteById.get(result.lastInsertRowid);
    res.status(201).send(newQuote);
  } else {
    res.status(400).send({ errors: errors });
  }
});
const updateQuote = db.prepare(`
UPDATE quotes SET likes=? WHERE id=?;
`);
app.patch('/quotes/:id', (req, res) => {
  const id = req.params.id;
  const likes = req.body.likes;

  const result = getQuoteById.get(id);
  if (result) {
    // if (typeof likes === 'number') result.likes = likes;
    updateQuote.run(likes, id);

    const updatedQuote = getQuoteById.get(id);
    res.send(updatedQuote);
  } else {
    res.status(404).send({ error: 'No quote found with that id.' });
  }
});

const deleteQuote = db.prepare(`
DELETE FROM quotes WHERE id=?;
`);
app.delete('/quotes/:id', (req, res) => {
  const id = req.params.id;
  const result = deleteQuote.run(id);
  console.log('result:', result);

  if (result.changes !== 0) {
    res.send({ message: 'Quote deleted succesfully.' });
  } else {
    res.status(404).send({ error: 'Quote does not exist.' });
  }
});
app.listen(PORT, () => {
  console.log(`Server running in port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});
