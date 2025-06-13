import pool from '../db/db.js';

// Aggiungi nuova tipologica
export async function creaTipologica(req, res) {
  const { descrizione } = req.body;

  if (!descrizione || descrizione.trim() === "") {
    return res.status(400).send("Descrizione obbligatoria");
  }

  try {
    const query = 'INSERT INTO tipologiche (descrizione) VALUES ($1) RETURNING *';
    const result = await pool.query(query, [descrizione]);

    res.status(201).json({
      messaggio: 'Tipologica creata con successo',
      tipologica: result.rows[0]
    });
  } catch (err) {
    console.error("Errore durante l'inserimento:", err);
    res.status(500).send("Errore del server");
  }
}

// Ricerca tipologiche per descrizione (case insensitive, parziale)
export async function ricercaTipologiche(req, res) {
  const { descrizione } = req.query;

  try {
    let query = 'SELECT * FROM tipologiche';
    const values = [];

    if (descrizione) {
      query += ' WHERE descrizione ILIKE $1';
      values.push(`%${descrizione}%`);
    }

    const result = await pool.query(query, values);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Errore durante la ricerca delle tipologiche:", err);
    res.status(500).send("Errore del server");
  }
}

// ✅ NUOVO: Recupera una tipologica per ID (per il form modifica)
export async function getTipologicaById(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT * FROM tipologiche WHERE id_tipologica = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).send('Tipologica non trovata');
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Errore nel recupero tipologica:', err);
    res.status(500).send('Errore nel server');
  }
}

// Modifica una tipologica esistente
export async function modificaTipologica(req, res) {
  const { id } = req.params;
  const { descrizione } = req.body;

  if (!descrizione || descrizione.trim() === '') {
    return res.status(400).send("La descrizione è obbligatoria");
  }

  try {
    const result = await pool.query(
      `UPDATE tipologiche
       SET descrizione = $1
       WHERE id_tipologica = $2
       RETURNING *`,
      [descrizione.trim(), id]
    );

    if (result.rowCount === 0) {
      return res.status(404).send("Tipologica non trovata");
    }

    res.status(200).json({ messaggio: "Tipologica aggiornata con successo", tipologica: result.rows[0] });
  } catch (err) {
    console.error("Errore nella modifica tipologica:", err);
    res.status(500).send("Errore nel server");
  }
}

// Elimina una tipologica
export async function eliminaTipologica(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM tipologiche
       WHERE id_tipologica = $1
       RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).send("Tipologica non trovata");
    }

    res.status(200).json({ messaggio: "Tipologica eliminata con successo", tipologica: result.rows[0] });
  } catch (err) {
    console.error("Errore eliminazione tipologica:", err);
    res.status(500).send("Errore nel server");
  }
}