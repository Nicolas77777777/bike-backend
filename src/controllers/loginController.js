import pool from '../db/db.js';

export async function inserisciLogin(req, res) {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO login (username, password) VALUES ($1, $2) RETURNING *',
      [username, password]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Errore inserimento login:', err);
    res.status(500).send('Errore nel server');
  }
}

export async function controllaLogin(req, res) {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM login WHERE username = $1 AND password = $2',
      [username, password]
    );

    if (result.rowCount > 0) {
      res.json(result.rows);
    } else {
      res.status(401).send('Utente non trovato');
    }
  } catch (err) {
    console.error('Errore lettura login:', err);
    res.status(500).send('Errore nel server');
  }
}
