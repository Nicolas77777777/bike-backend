import { fileURLToPath } from 'url';

import pool from '../db/db.js';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ✅ Aggiungi un cliente a un evento
export async function iscriviCliente(req, res) {
  const { id_cliente, id_evento } = req.body;

  if (!id_cliente || !id_evento) {
    return res.status(400).json({ errore: 'id_cliente e id_evento sono obbligatori' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO cliente_evento (id_cliente, id_evento)
       VALUES ($1, $2)
       ON CONFLICT (id_cliente, id_evento) DO NOTHING
       RETURNING *`,
      [id_cliente, id_evento]
    );

    if (result.rowCount === 0) {
      return res.status(409).json({ messaggio: 'Cliente già iscritto a questo evento' });
    }

    res.status(201).json({ messaggio: 'Iscrizione avvenuta con successo', iscrizione: result.rows[0] });
  } catch (err) {
    console.error('Errore iscrizione:', err);
    res.status(500).json({ errore: 'Errore nel server' });
  }
}

// ✅ Ottieni tutti i clienti iscritti a un evento
export async function clientiPerEvento(req, res) {
  const { id_evento } = req.params;

  try {
    const result = await pool.query(`
      SELECT c.*
      FROM cliente_evento ce
      JOIN cliente c ON ce.id_cliente = c.id_cliente
      WHERE ce.id_evento = $1
    `, [id_evento]);

    res.json(result.rows);
  } catch (err) {
    console.error('Errore clienti per evento:', err);
    res.status(500).json({ errore: 'Errore nel server' });
  }
}

// ✅ Ottieni tutti gli eventi a cui un cliente è iscritto
export async function eventiPerCliente(req, res) {
  const { id_cliente } = req.params;

  try {
    const result = await pool.query(`
      SELECT e.*
      FROM cliente_evento ce
      JOIN evento e ON ce.id_evento = e.id_evento
      WHERE ce.id_cliente = $1
    `, [id_cliente]);

    res.json(result.rows);
  } catch (err) {
    console.error('Errore eventi per cliente:', err);
    res.status(500).json({ errore: 'Errore nel server' });
  }
}

// ✅ Rimuovi l'iscrizione di un cliente da un evento
export async function rimuoviIscrizione(req, res) {
  const { id_cliente, id_evento } = req.body;

  try {
    const result = await pool.query(`
      DELETE FROM cliente_evento
      WHERE id_cliente = $1 AND id_evento = $2
      RETURNING *
    `, [id_cliente, id_evento]);

    if (result.rowCount === 0) {
      return res.status(404).json({ messaggio: 'Nessuna iscrizione trovata' });
    }

    res.json({ messaggio: 'Iscrizione rimossa con successo' });
  } catch (err) {
    console.error('Errore eliminazione iscrizione:', err);
    res.status(500).json({ errore: 'Errore nel server' });
  }
}

export async function esportaIscrittiEvento(req, res) {
  const { id_evento } = req.params;

  try {
    const [eventoRes, iscrittiRes] = await Promise.all([
      pool.query('SELECT * FROM evento WHERE id_evento = $1', [id_evento]),
      pool.query(`
        SELECT c.*
        FROM cliente_evento ce
        JOIN cliente c ON ce.id_cliente = c.id_cliente
        WHERE ce.id_evento = $1
      `, [id_evento])
    ]);

    const evento = eventoRes.rows[0];
    const iscritti = iscrittiRes.rows;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Iscritti');

    sheet.addRow([`Iscritti all'evento: ${evento.titolo}`]).font = { bold: true, size: 14 };
    sheet.addRow([]);
    const headerRow = sheet.addRow(['Nome', 'Cognome / Rag. Soc.', 'Email', 'Cellulare', 'Cod. Fiscale / P.IVA']);
    headerRow.font = { bold: true };

    iscritti.forEach(c => {
      sheet.addRow([c.nome, c.cognome_rag_soc, c.email, c.cellulare, c.cf_piva]);
    });

    const exportPath = path.join(process.cwd(), 'export');
    if (!fs.existsSync(exportPath)) fs.mkdirSync(exportPath);
    const filePath = path.join(exportPath, `iscritti_evento_${id_evento}.xlsx`);

    await workbook.xlsx.writeFile(filePath);

    console.log("✅ File Excel generato:", filePath);
    res.status(200).json({ path: `/download/${path.basename(filePath)}` });
  } catch (err) {
    console.error('❌ Errore generazione Excel:', err);
    res.status(500).json({ errore: 'Errore nel salvataggio del file Excel' });
  }
}

export async function esportaIscrittiEventoPDF(req, res) {
  const { id_evento } = req.params;

  try {
    // Recupera evento e iscritti
    const eventoQuery = await pool.query(
      `SELECT e.titolo, e.data_inizio, e.data_fine, t.descrizione AS categoria
       FROM evento e
       JOIN tipologiche t ON e.categoria = t.id_tipologica
       WHERE e.id_evento = $1`,
      [id_evento]
    );

    const iscrittiQuery = await pool.query(
      `SELECT c.nome, c.cognome_rag_soc, c.email, c.cellulare, c.cf_piva
       FROM cliente_evento ce
       JOIN cliente c ON ce.id_cliente = c.id_cliente
       WHERE ce.id_evento = $1`,
      [id_evento]
    );

    const evento = eventoQuery.rows[0];
    const iscritti = iscrittiQuery.rows;

    // Crea documento PDF
    const doc = new PDFDocument();
    const exportPath = path.join(__dirname, '../../export');
    const filename = `iscritti_evento_${id_evento}.pdf`;
    const filePath = path.join(exportPath, filename);

    doc.pipe(fs.createWriteStream(filePath));

    doc.fontSize(18).text(`Iscritti all'evento: ${evento.titolo}`, { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Categoria: ${evento.categoria}`);
    doc.text(`Dal ${evento.data_inizio} al ${evento.data_fine}`);
    doc.moveDown();

    doc.fontSize(14).text('Elenco Iscritti:', { underline: true });
    doc.moveDown();

    iscritti.forEach((c, i) => {
      doc.fontSize(12).text(`${i + 1}. ${c.nome} ${c.cognome_rag_soc} - ${c.email} - ${c.cellulare} - ${c.cf_piva}`);
    });

    doc.end();

    res.status(200).json({ messaggio: 'PDF generato con successo', filename });
  } catch (err) {
    console.error('❌ Errore generazione PDF:', err);
    res.status(500).json({ errore: 'Errore generazione PDF' });
  }
}
