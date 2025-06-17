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
    console.error('❌ Errore iscrizione:', err);
    res.status(500).json({ errore: 'Errore nel server' });
  }
}

// ✅ Ottieni tutti i clienti iscritti a un evento
export async function clientiPerEvento(req, res) {
  const { id_evento } = req.params;

  if (!id_evento || isNaN(parseInt(id_evento))) {
    return res.status(400).json({ errore: 'ID evento non valido' });
  }

  try {
    const result = await pool.query(`
      SELECT c.*
      FROM cliente_evento ce
      JOIN cliente c ON ce.id_cliente = c.id_cliente
      WHERE ce.id_evento = $1
      ORDER BY c.cognome_rag_soc, c.nome
    `, [id_evento]);

    console.log(`✅ Trovati ${result.rows.length} clienti per evento ${id_evento}`);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Errore clienti per evento:', err);
    res.status(500).json({ errore: 'Errore nel server' });
  }
}

// ✅ Ottieni tutti gli eventi a cui un cliente è iscritto
export async function eventiPerCliente(req, res) {
  const { id_cliente } = req.params;

  if (!id_cliente || isNaN(parseInt(id_cliente))) {
    return res.status(400).json({ errore: 'ID cliente non valido' });
  }

  try {
    const result = await pool.query(`
      SELECT e.*, t.descrizione AS categoria_descrizione
      FROM cliente_evento ce
      JOIN evento e ON ce.id_evento = e.id_evento
      JOIN tipologiche t ON e.categoria = t.id_tipologica
      WHERE ce.id_cliente = $1
      ORDER BY e.data_inizio DESC
    `, [id_cliente]);

    console.log(`✅ Trovati ${result.rows.length} eventi per cliente ${id_cliente}`);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Errore eventi per cliente:', err);
    res.status(500).json({ errore: 'Errore nel server' });
  }
}

// ✅ Rimuovi l'iscrizione di un cliente da un evento
export async function rimuoviIscrizione(req, res) {
  const { id_cliente, id_evento } = req.body;

  if (!id_cliente || !id_evento) {
    return res.status(400).json({ errore: 'id_cliente e id_evento sono obbligatori' });
  }

  try {
    const result = await pool.query(`
      DELETE FROM cliente_evento
      WHERE id_cliente = $1 AND id_evento = $2
      RETURNING *
    `, [id_cliente, id_evento]);

    if (result.rowCount === 0) {
      return res.status(404).json({ messaggio: 'Nessuna iscrizione trovata' });
    }

    console.log(`✅ Rimossa iscrizione cliente ${id_cliente} da evento ${id_evento}`);
    res.json({ messaggio: 'Iscrizione rimossa con successo' });
  } catch (err) {
    console.error('❌ Errore eliminazione iscrizione:', err);
    res.status(500).json({ errore: 'Errore nel server' });
  }
}

// ✅ EXPORT EXCEL - OTTIMIZZATO E COMPLETO
export async function esportaIscrittiEvento(req, res) {
  const { id_evento } = req.params;

  // Validazione ID evento
  if (!id_evento || isNaN(parseInt(id_evento))) {
    return res.status(400).json({ errore: 'ID evento non valido' });
  }

  try {
    console.log(`📊 Avvio export Excel per evento ${id_evento}`);

    // Recupera evento e iscritti con JOIN per avere dati completi
    const [eventoRes, iscrittiRes] = await Promise.all([
      pool.query(`
        SELECT e.*, t.descrizione AS categoria_descrizione
        FROM evento e
        JOIN tipologiche t ON e.categoria = t.id_tipologica
        WHERE e.id_evento = $1
      `, [id_evento]),
      pool.query(`
        SELECT c.*, 
               CASE 
                 WHEN c.data_scadenza >= CURRENT_DATE THEN 'Valida'
                 ELSE 'Scaduta'
               END as stato_tessera
        FROM cliente_evento ce
        JOIN cliente c ON ce.id_cliente = c.id_cliente
        WHERE ce.id_evento = $1
        ORDER BY c.cognome_rag_soc, c.nome
      `, [id_evento])
    ]);

    const evento = eventoRes.rows[0];
    const iscritti = iscrittiRes.rows;

    if (!evento) {
      return res.status(404).json({ errore: 'Evento non trovato' });
    }

    console.log(`✅ Evento trovato: "${evento.titolo}" con ${iscritti.length} iscritti`);

    // Crea workbook Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Bike and Hike';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Iscritti Evento');

    // ✅ HEADER CON INFORMAZIONI EVENTO
    sheet.addRow([`ISCRITTI ALL'EVENTO: ${evento.titolo.toUpperCase()}`]);
    sheet.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF0066CC' } };
    sheet.getRow(1).alignment = { horizontal: 'center' };
    
    sheet.addRow([`Categoria: ${evento.categoria_descrizione}`]);
    sheet.getRow(2).font = { size: 12, italic: true };
    
    // Formatta le date
    const dataInizio = evento.data_inizio ? new Date(evento.data_inizio).toLocaleDateString('it-IT') : 'N/A';
    const dataFine = evento.data_fine ? new Date(evento.data_fine).toLocaleDateString('it-IT') : 'N/A';
    
    sheet.addRow([`Periodo: dal ${dataInizio} al ${dataFine}`]);
    sheet.getRow(3).font = { size: 12 };
    
    if (evento.luogo) {
      sheet.addRow([`Luogo: ${evento.luogo}`]);
      sheet.getRow(4).font = { size: 12 };
    }
    
    sheet.addRow([`Totale iscritti: ${iscritti.length}`]);
    sheet.getRow(5).font = { bold: true, size: 12, color: { argb: 'FF009900' } };
    
    sheet.addRow([`Esportato il: ${new Date().toLocaleString('it-IT')}`]);
    sheet.getRow(6).font = { size: 10, italic: true };
    
    sheet.addRow([]); // Riga vuota

    // ✅ HEADER TABELLA
    const headerRow = sheet.addRow([
      'N°', 'Nome', 'Cognome/Rag. Soc.', 'Email', 'Cellulare', 
      'Cod. Fiscale/P.IVA', 'Città', 'Stato Tessera', 'Note'
    ]);
    
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    headerRow.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // ✅ DATI ISCRITTI
    iscritti.forEach((cliente, index) => {
      const row = sheet.addRow([
        index + 1,
        cliente.nome || '',
        cliente.cognome_rag_soc || '',
        cliente.email || '',
        cliente.cellulare || '',
        cliente.cf_piva || '',
        cliente.citta || '',
        cliente.stato_tessera || '',
        cliente.note || ''
      ]);

      // Colora le righe alternate
      if (index % 2 === 1) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' }
        };
      }

      // Evidenzia tessere scadute
      if (cliente.stato_tessera === 'Scaduta') {
        row.getCell(8).font = { color: { argb: 'FFFF0000' }, bold: true };
      }

      // Bordi per tutte le celle
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // ✅ AUTO-WIDTH COLONNE
    sheet.columns = [
      { width: 5 },   // N°
      { width: 15 },  // Nome
      { width: 20 },  // Cognome
      { width: 25 },  // Email
      { width: 15 },  // Cellulare
      { width: 18 },  // CF/PIVA
      { width: 15 },  // Città
      { width: 12 },  // Stato tessera
      { width: 30 }   // Note
    ];

    // ✅ MERGE CELLE HEADER
    sheet.mergeCells('A1:I1');
    if (evento.luogo) {
      sheet.mergeCells('A2:I2');
      sheet.mergeCells('A3:I3');
      sheet.mergeCells('A4:I4');
    } else {
      sheet.mergeCells('A2:I2');
      sheet.mergeCells('A3:I3');
    }

    // ✅ CREA CARTELLA EXPORT
    const exportPath = path.join(process.cwd(), 'export');
    if (!fs.existsSync(exportPath)) {
      fs.mkdirSync(exportPath, { recursive: true });
      console.log('📁 Cartella export creata');
    }

    // ✅ GENERA NOME FILE UNICO
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `iscritti_evento_${id_evento}_${timestamp}_${Date.now()}.xlsx`;
    const filePath = path.join(exportPath, filename);

    // ✅ SALVA FILE
    await workbook.xlsx.writeFile(filePath);

    console.log(`✅ File Excel generato: ${filename}`);
    console.log(`📁 Path completo: ${filePath}`);

    // ✅ RISPOSTA CON TUTTE LE INFO
    res.status(200).json({
      path: `/download/${filename}`,
      messaggio: 'File Excel generato con successo',
      filename: filename,
      evento: {
        id: evento.id_evento,
        titolo: evento.titolo,
        categoria: evento.categoria_descrizione
      },
      statistiche: {
        totale_iscritti: iscritti.length,
        tessere_valide: iscritti.filter(c => c.stato_tessera === 'Valida').length,
        tessere_scadute: iscritti.filter(c => c.stato_tessera === 'Scaduta').length
      },
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('❌ Errore generazione Excel:', err);
    res.status(500).json({ 
      errore: 'Errore nella generazione del file Excel',
      dettagli: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}

// ✅ EXPORT PDF - OTTIMIZZATO
export async function esportaIscrittiEventoPDF(req, res) {
  const { id_evento } = req.params;

  // Validazione ID evento
  if (!id_evento || isNaN(parseInt(id_evento))) {
    return res.status(400).json({ errore: 'ID evento non valido' });
  }

  try {
    console.log(`📄 Avvio export PDF per evento ${id_evento}`);

    // Recupera evento e iscritti
    const eventoQuery = await pool.query(`
      SELECT e.titolo, e.data_inizio, e.data_fine, e.luogo, t.descrizione AS categoria
      FROM evento e
      JOIN tipologiche t ON e.categoria = t.id_tipologica
      WHERE e.id_evento = $1
    `, [id_evento]);

    const iscrittiQuery = await pool.query(`
      SELECT c.nome, c.cognome_rag_soc, c.email, c.cellulare, c.cf_piva,
             CASE 
               WHEN c.data_scadenza >= CURRENT_DATE THEN 'Valida'
               ELSE 'Scaduta'
             END as stato_tessera
      FROM cliente_evento ce
      JOIN cliente c ON ce.id_cliente = c.id_cliente
      WHERE ce.id_evento = $1
      ORDER BY c.cognome_rag_soc, c.nome
    `, [id_evento]);

    const evento = eventoQuery.rows[0];
    const iscritti = iscrittiQuery.rows;

    if (!evento) {
      return res.status(404).json({ errore: 'Evento non trovato' });
    }

    // Crea cartella export
    const exportPath = path.join(__dirname, '../../export');
    if (!fs.existsSync(exportPath)) {
      fs.mkdirSync(exportPath, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `iscritti_evento_${id_evento}_${timestamp}.pdf`;
    const filePath = path.join(exportPath, filename);

    // Crea documento PDF
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(fs.createWriteStream(filePath));

    // Header PDF
    doc.fontSize(18).text(`Iscritti all'evento: ${evento.titolo}`, { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Categoria: ${evento.categoria}`);
    
    if (evento.data_inizio && evento.data_fine) {
      const dataInizio = new Date(evento.data_inizio).toLocaleDateString('it-IT');
      const dataFine = new Date(evento.data_fine).toLocaleDateString('it-IT');
      doc.text(`Periodo: dal ${dataInizio} al ${dataFine}`);
    }
    
    if (evento.luogo) {
      doc.text(`Luogo: ${evento.luogo}`);
    }
    
    doc.text(`Totale iscritti: ${iscritti.length}`);
    doc.moveDown();

    doc.fontSize(14).text('Elenco Iscritti:', { underline: true });
    doc.moveDown();

    // Lista iscritti
    iscritti.forEach((c, i) => {
      const tesseraStatus = c.stato_tessera === 'Scaduta' ? ' (TESSERA SCADUTA)' : '';
      doc.fontSize(10).text(
        `${i + 1}. ${c.nome || ''} ${c.cognome_rag_soc || ''} - ${c.email || 'N/A'} - ${c.cellulare || 'N/A'} - ${c.cf_piva || 'N/A'}${tesseraStatus}`
      );
    });

    doc.end();

    console.log(`✅ File PDF generato: ${filename}`);

    res.status(200).json({ 
      messaggio: 'PDF generato con successo', 
      filename: filename,
      path: `/download/${filename}`,
      statistiche: {
        totale_iscritti: iscritti.length,
        tessere_valide: iscritti.filter(c => c.stato_tessera === 'Valida').length,
        tessere_scadute: iscritti.filter(c => c.stato_tessera === 'Scaduta').length
      }
    });
  } catch (err) {
    console.error('❌ Errore generazione PDF:', err);
    res.status(500).json({ 
      errore: 'Errore generazione PDF',
      dettagli: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}