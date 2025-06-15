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

// ✅ NUOVA FUNZIONE: Lista completa di tutti i clienti iscritti
export async function listaClienti(req, res) {
  try {
    // Query con possibili parametri di ordinamento e filtro
    const { 
      orderBy = 'cognome_rag_soc', 
      order = 'ASC', 
      limit,
      offset,
      attivi_solo = false 
    } = req.query;

    // Costruisce la query base
    let query = `
      SELECT 
        id_cliente,
        numero_tessera,
        cellulare,
        nome,
        cognome_rag_soc,
        luogo_nascita,
        data_nascita,
        data_iscrizione,
        data_scadenza,
        indirizzo,
        citta,
        provincia,
        cap,
        cf_piva,
        email,
        note,
        CASE 
          WHEN data_scadenza >= CURRENT_DATE THEN true 
          ELSE false 
        END as tessera_valida
      FROM cliente
    `;

    const valori = [];
    const condizioni = [];

    // ✅ Filtro per tessere attive/scadute
    if (attivi_solo === 'true') {
      condizioni.push('data_scadenza >= CURRENT_DATE');
    }

    // Aggiunge condizioni WHERE se presenti
    if (condizioni.length > 0) {
      query += ' WHERE ' + condizioni.join(' AND ');
    }

    // ✅ Ordinamento sicuro (previene SQL injection)
    const campiValidi = [
      'id_cliente', 'numero_tessera', 'cognome_rag_soc', 'nome', 
      'data_iscrizione', 'data_scadenza', 'citta', 'provincia'
    ];
    const orderDirection = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    
    if (campiValidi.includes(orderBy)) {
      query += ` ORDER BY ${orderBy} ${orderDirection}`;
    } else {
      query += ` ORDER BY cognome_rag_soc ASC`; // Default fallback
    }

    // ✅ Paginazione (opzionale)
    if (limit) {
      const limitNum = parseInt(limit);
      const offsetNum = parseInt(offset) || 0;
      
      if (limitNum > 0 && limitNum <= 1000) { // Max 1000 per sicurezza
        query += ` LIMIT ${limitNum} OFFSET ${offsetNum}`;
      }
    }

    console.log('📋 Query lista clienti:', query);
    
    const result = await pool.query(query, valori);
    
    // ✅ Risposta con metadati utili
    const response = {
      clienti: result.rows,
      totale: result.rowCount,
      timestamp: new Date().toISOString(),
      parametri: {
        orderBy,
        order: orderDirection,
        limit: limit || 'nessun limite',
        offset: offset || 0,
        solo_attivi: attivi_solo === 'true'
      }
    };

    console.log(`✅ Lista clienti recuperata: ${result.rowCount} clienti trovati`);
    res.status(200).json(response);
    
  } catch (err) {
    console.error('❌ Errore recupero lista clienti:', err);
    res.status(500).json({ 
      errore: 'Errore durante il recupero della lista clienti',
      dettagli: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}

// ✅ NUOVA FUNZIONE: Statistiche clienti
export async function statisticheClienti(req, res) {
  try {
    const query = `
      SELECT 
        COUNT(*) as totale_clienti,
        COUNT(CASE WHEN data_scadenza >= CURRENT_DATE THEN 1 END) as tessere_valide,
        COUNT(CASE WHEN data_scadenza < CURRENT_DATE THEN 1 END) as tessere_scadute,
        MIN(data_iscrizione) as prima_iscrizione,
        MAX(data_iscrizione) as ultima_iscrizione,
        COUNT(CASE WHEN data_iscrizione >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as nuovi_ultimo_mese,
        COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as con_email,
        COUNT(CASE WHEN cellulare IS NOT NULL AND cellulare != '' THEN 1 END) as con_cellulare
      FROM cliente;
    `;

    const result = await pool.query(query);
    const stats = result.rows[0];

    console.log('📊 Statistiche clienti calcolate');
    res.status(200).json({
      statistiche: {
        totale_clienti: parseInt(stats.totale_clienti),
        tessere_valide: parseInt(stats.tessere_valide),
        tessere_scadute: parseInt(stats.tessere_scadute),
        prima_iscrizione: stats.prima_iscrizione,
        ultima_iscrizione: stats.ultima_iscrizione,
        nuovi_ultimo_mese: parseInt(stats.nuovi_ultimo_mese),
        con_email: parseInt(stats.con_email),
        con_cellulare: parseInt(stats.con_cellulare),
        percentuale_tessere_valide: stats.totale_clienti > 0 
          ? Math.round((stats.tessere_valide / stats.totale_clienti) * 100) 
          : 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('❌ Errore calcolo statistiche clienti:', err);
    res.status(500).json({ 
      errore: 'Errore durante il calcolo delle statistiche',
      dettagli: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
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

// ✅ CORRETTO: Recupera un cliente per ID con validazione
export async function getClienteById(req, res) {
  const id = req.params.id;

  // ✅ VALIDAZIONE: Controlla che l'ID sia un numero valido
  if (!id || isNaN(parseInt(id))) {
    console.error(`❌ ID cliente non valido ricevuto: "${id}" (tipo: ${typeof id})`);
    return res.status(400).json({ 
      errore: 'ID cliente non valido. Deve essere un numero.' 
    });
  }

  const clienteId = parseInt(id);
  
  // ✅ CONTROLLO: ID deve essere positivo
  if (clienteId <= 0) {
    console.error(`❌ ID cliente deve essere positivo: ${clienteId}`);
    return res.status(400).json({ 
      errore: 'ID cliente deve essere un numero positivo.' 
    });
  }

  try {
    console.log(`🔍 Ricerca cliente con ID: ${clienteId}`);
    
    const result = await pool.query(
      'SELECT * FROM cliente WHERE id_cliente = $1', 
      [clienteId]
    );

    if (result.rowCount === 0) {
      console.log(`⚠️ Cliente non trovato con ID: ${clienteId}`);
      return res.status(404).json({ 
        errore: 'Cliente non trovato' 
      });
    }

    console.log(`✅ Cliente trovato con ID: ${clienteId}`);
    res.json(result.rows[0]);
    
  } catch (err) {
    console.error('❌ Errore nel recupero cliente:', err);
    console.error('❌ Parametri:', { id, clienteId, tipo_id: typeof id });
    res.status(500).json({ 
      errore: 'Errore interno del server',
      dettagli: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}

// ✅ CORRETTO: Modifica cliente con validazione
export async function modificaCliente(req, res) {
  const id = req.params.id;
  
  // ✅ VALIDAZIONE ID
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ 
      errore: 'ID cliente non valido. Deve essere un numero.' 
    });
  }

  const clienteId = parseInt(id);
  
  if (clienteId <= 0) {
    return res.status(400).json({ 
      errore: 'ID cliente deve essere un numero positivo.' 
    });
  }

  const {
    cellulare, nome, cognome_rag_soc, luogo_nascita, data_nascita,
    data_iscrizione, data_scadenza, indirizzo, citta, provincia,
    cap, cf_piva, email, note
  } = req.body;

  try {
    console.log(`💾 Modifica cliente ID: ${clienteId}`);
    
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
      cap, cf_piva, email, note, clienteId
    ];

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ 
        errore: 'Cliente non trovato' 
      });
    }

    console.log(`✅ Cliente modificato con successo: ${clienteId}`);
    res.status(200).json({ 
      messaggio: 'Cliente aggiornato con successo',
      cliente: result.rows[0]
    });
    
  } catch (err) {
    console.error('❌ Errore aggiornamento cliente:', err);
    res.status(500).json({ 
      errore: 'Errore interno del server',
      dettagli: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}

// ✅ CORRETTO: Elimina cliente con validazione
export async function eliminaCliente(req, res) {
  const id = req.params.id;

  // ✅ VALIDAZIONE ID
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ 
      errore: 'ID cliente non valido. Deve essere un numero.' 
    });
  }

  const clienteId = parseInt(id);
  
  if (clienteId <= 0) {
    return res.status(400).json({ 
      errore: 'ID cliente deve essere un numero positivo.' 
    });
  }

  try {
    console.log(`🗑️ Eliminazione cliente ID: ${clienteId}`);
    
    const result = await pool.query(
      'DELETE FROM cliente WHERE id_cliente = $1 RETURNING *;', 
      [clienteId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ 
        errore: 'Cliente non trovato' 
      });
    }

    console.log(`✅ Cliente eliminato con successo: ${clienteId}`);
    res.status(200).json({ 
      messaggio: 'Cliente eliminato con successo',
      cliente: result.rows[0]
    });
    
  } catch (err) {
    console.error('❌ Errore durante l\'eliminazione del cliente:', err);
    res.status(500).json({ 
      errore: 'Errore interno del server',
      dettagli: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}