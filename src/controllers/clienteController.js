import pool from '../db/db.js';

// Crea un nuovo cliente
export async function creaCliente(req, res) {
  const {
    cellulare, nome, cognome_rag_soc, luogo_nascita, data_nascita,
    data_iscrizione, data_scadenza, indirizzo, citta, provincia,
    cap, cf_piva, email, note
  } = req.body;

  try {
    const query = `
      INSERT INTO cliente (
        cellulare, nome, cognome_rag_soc, luogo_nascita, data_nascita,
        data_iscrizione, data_scadenza, indirizzo, citta, provincia,
        cap, cf_piva, email, note
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14
      ) RETURNING *;
    `;
    const values = [
      cellulare || null, nome || null, cognome_rag_soc || null, luogo_nascita || null,
      data_nascita || null, data_iscrizione || null, data_scadenza || null, indirizzo || null,
      citta || null, provincia || null, cap || null, cf_piva || null, email || null, note || null
    ];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Errore inserimento cliente:", err);
    res.status(500).send("Errore nel server");
  }
}

// Ricerca clienti con filtro
export async function ricercaCliente(req, res) {
  const { cognome_rag_soc, nome, cf_piva, email, cellulare } = req.query;
  const condizioni = [];
  const valori = [];

  if (cognome_rag_soc) {
    condizioni.push(`cognome_rag_soc ILIKE $${condizioni.length + 1}`);
    valori.push(`%${cognome_rag_soc}%`);
  }
  if (nome) {
    condizioni.push(`nome ILIKE $${condizioni.length + 1}`);
    valori.push(`%${nome}%`);
  }
  if (cf_piva) {
    condizioni.push(`cf_piva ILIKE $${condizioni.length + 1}`);
    valori.push(`%${cf_piva}%`);
  }
  if (email) {
    condizioni.push(`email ILIKE $${condizioni.length + 1}`);
    valori.push(`%${email}%`);
  }
  if (cellulare) {
    condizioni.push(`cellulare ILIKE $${condizioni.length + 1}`);
    valori.push(`%${cellulare}%`);
  }

  let query = 'SELECT * FROM cliente';
  if (condizioni.length > 0) {
    query += ' WHERE ' + condizioni.join(' AND ');
  }

  try {
    const result = await pool.query(query, valori);
    res.json(result.rows);
  } catch (err) {
    console.error("Errore durante la ricerca cliente:", err);
    res.status(500).send("Errore nel server");
  }
}

// Recupera un cliente per ID
export async function getClienteById(req, res) {
  const id = req.params.id;

  try {
    const result = await pool.query('SELECT * FROM cliente WHERE id_cliente = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).send('Cliente non trovato');
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Errore nel recupero cliente:', err);
    res.status(500).send('Errore nel server');
  }
}

// Modifica cliente
export async function modificaCliente(req, res) {
  const id = req.params.id;
  const {
    cellulare, nome, cognome_rag_soc, luogo_nascita, data_nascita,
    data_iscrizione, data_scadenza, indirizzo, citta, provincia,
    cap, cf_piva, email, note
  } = req.body;

  try {
    const query = `
      UPDATE cliente SET
        cellulare = $1, nome = $2, cognome_rag_soc = $3, luogo_nascita = $4,
        data_nascita = $5, data_iscrizione = $6, data_scadenza = $7,
        indirizzo = $8, citta = $9, provincia = $10, cap = $11,
        cf_piva = $12, email = $13, note = $14
      WHERE id_cliente = $15 RETURNING *;
    `;

    const values = [
      cellulare, nome, cognome_rag_soc, luogo_nascita, data_nascita,
      data_iscrizione, data_scadenza, indirizzo, citta, provincia,
      cap, cf_piva, email, note, id
    ];

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).send('Cliente non trovato');
    }

    res.status(200).json({ messaggio: 'Cliente aggiornato con successo' });
  } catch (err) {
    console.error('Errore aggiornamento cliente:', err);
    res.status(500).send('Errore nel server');
  }
}

// Elimina cliente
export async function eliminaCliente(req, res) {
  const id = req.params.id;

  try {
    const result = await pool.query('DELETE FROM cliente WHERE id_cliente = $1 RETURNING *;', [id]);

    if (result.rowCount === 0) {
      return res.status(404).send('Cliente non trovato');
    }

    res.status(200).json({ messaggio: 'Cliente eliminato con successo' });
  } catch (err) {
    console.error('Errore durante l\'eliminazione del cliente:', err);
    res.status(500).send('Errore nel server');
  }
}

