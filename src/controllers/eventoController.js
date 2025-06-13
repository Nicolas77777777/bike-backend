import pool from '../db/db.js';

// ✅ CREA un nuovo evento
export async function creaEvento(req, res) {
  const {
    titolo,
    categoria,
    data_inizio,
    data_fine,
    orario_inizio,
    orario_fine,
    luogo,
    note,
    prezzo
  } = req.body;

  // Controllo campi obbligatori
  if (!titolo || !categoria || !data_inizio || !data_fine) {
    return res.status(400).json({ errore: "Campi obbligatori mancanti" });
  }

  try {
    const query = `
      INSERT INTO evento (
        titolo, categoria, data_inizio, data_fine,
        orario_inizio, orario_fine, luogo, note, prezzo
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *;
    `;
    const valori = [
      titolo, categoria, data_inizio, data_fine,
      orario_inizio || null, orario_fine || null,
      luogo || null, note || null, prezzo || null
    ];

    const result = await pool.query(query, valori);
    res.status(201).json({ messaggio: "Evento creato", evento: result.rows[0] });
  } catch (err) {
    console.error("Errore creazione evento:", err);
    res.status(500).send("Errore del server");
  }
}

// ✅ RICERCA eventi (opzionale: per titolo, categoria, date)
export async function ricercaEventi(req, res) {
  const { titolo, categoria, data_inizio, data_fine } = req.query;
  const condizioni = [];
  const valori = [];

  let query = `
    SELECT e.*, t.descrizione AS categoria_descrizione
    FROM evento e
    JOIN tipologiche t ON e.categoria = t.id_tipologica
  `;

  if (titolo) {
    condizioni.push(`LOWER(e.titolo) LIKE LOWER($${valori.length + 1})`);
    valori.push(`%${titolo}%`);
  }

  if (categoria) {
    condizioni.push(`e.categoria = $${valori.length + 1}`);
    valori.push(categoria);
  }

  if (data_inizio) {
    condizioni.push(`e.data_inizio >= $${valori.length + 1}`);
    valori.push(data_inizio);
  }

  if (data_fine) {
    condizioni.push(`e.data_fine <= $${valori.length + 1}`);
    valori.push(data_fine);
  }

  if (condizioni.length > 0) {
    query += ` WHERE ` + condizioni.join(' AND ');
  }

  query += ` ORDER BY e.data_inizio DESC`;

  try {
    const result = await pool.query(query, valori);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Errore ricerca eventi:", err);
    res.status(500).send("Errore del server");
  }
}


// ✅ MOSTRA un evento singolo per ID (con JOIN su tipologiche)
export async function getEventoById(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT e.*, t.descrizione AS categoria_descrizione
      FROM evento e
      JOIN tipologiche t ON e.categoria = t.id_tipologica
      WHERE e.id_evento = $1
    `, [id]);

    if (result.rowCount === 0) {
      return res.status(404).send("Evento non trovato");
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Errore recupero evento:", err);
    res.status(500).send("Errore del server");
  }
}

// ✅ MODIFICA un evento esistente
export async function modificaEvento(req, res) {
  const { id } = req.params;
  const {
    titolo,
    categoria,
    data_inizio,
    data_fine,
    orario_inizio,
    orario_fine,
    luogo,
    note,
    prezzo
  } = req.body;

  try {
    const query = `
      UPDATE evento SET
        titolo = $1,
        categoria = $2,
        data_inizio = $3,
        data_fine = $4,
        orario_inizio = $5,
        orario_fine = $6,
        luogo = $7,
        note = $8,
        prezzo = $9
      WHERE id_evento = $10
      RETURNING *;
    `;
    const valori = [
      titolo, categoria, data_inizio, data_fine,
      orario_inizio || null, orario_fine || null,
      luogo || null, note || null, prezzo || null, id
    ];

    const result = await pool.query(query, valori);

    if (result.rowCount === 0) {
      return res.status(404).send("Evento non trovato");
    }

    res.status(200).json({ messaggio: "Evento aggiornato", evento: result.rows[0] });
  } catch (err) {
    console.error("Errore aggiornamento evento:", err);
    res.status(500).send("Errore del server");
  }
}

// ✅ ELIMINA un evento (cancellazione definitiva)
export async function eliminaEvento(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM evento WHERE id_evento = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).send("Evento non trovato");
    }

    res.status(200).json({ messaggio: "Evento eliminato", evento: result.rows[0] });
  } catch (err) {
    console.error("Errore eliminazione evento:", err);
    res.status(500).send("Errore del server");
  }
}
