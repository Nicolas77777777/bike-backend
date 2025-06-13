-- =============================
-- TABELLA LOGIN
-- =============================
-- Tabella per memorizzare gli accessi degli utenti
-- Utilizza SERIAL per generare automaticamente ID univoci
-- TEXT NOT NULL impone che i campi siano obbligatori

CREATE TABLE login (
    id_login SERIAL PRIMARY KEY,         -- Chiave primaria: ID autoincrementale
    username TEXT NOT NULL,              -- Nome utente (obbligatorio)
    password TEXT NOT NULL               -- Password (obbligatoria; si consiglia di criptarla)
);

-- =============================
-- TABELLA CLIENTE
-- =============================
-- Memorizza i dati anagrafici dei clienti dell'associazione

CREATE TABLE cliente (
    id_cliente SERIAL PRIMARY KEY,         -- ID univoco cliente (SERIAL = intero autoincrementale)
    numero_tessera SERIAL UNIQUE,          -- Tessera generata automaticamente (UNIQUE = non si può ripetere)
    cellulare VARCHAR(20),                 -- Numero di telefono (opzionale)
    nome VARCHAR(100),                     -- Nome (opzionale)
    cognome_rag_soc VARCHAR(150) NOT NULL,-- Cognome o Ragione Sociale (obbligatorio)
    luogo_nascita VARCHAR(100),            -- Luogo di nascita (opzionale)
    data_nascita DATE NOT NULL,            -- Data di nascita (obbligatoria)
    data_iscrizione DATE NOT NULL,         -- Data di iscrizione all’associazione (obbligatoria)
    data_scadenza DATE NOT NULL,           -- Scadenza tessera (obbligatoria)
    indirizzo VARCHAR(200),                -- Indirizzo di residenza (opzionale)
    citta VARCHAR(100),                    -- Città (opzionale)
    provincia VARCHAR(50),                 -- Provincia (opzionale)
    cap VARCHAR(20),                       -- CAP (opzionale)
    cf_piva VARCHAR(50),                   -- Codice Fiscale o Partita IVA (opzionale)
    email VARCHAR(150) NOT NULL,           -- Email obbligatoria
    note TEXT                              -- Note aggiuntive
);

-- =============================
-- TABELLA TIPOLOGICHE
-- =============================
-- Contiene l’elenco delle categorie (tipologie) degli eventi

CREATE TABLE tipologiche (
    id_tipologica SERIAL PRIMARY KEY,      -- ID categoria autoincrementale
    descrizione VARCHAR(255) NOT NULL      -- Descrizione della tipologia (obbligatoria)
);

-- =============================
-- TABELLA EVENTO
-- =============================
-- Elenco eventi organizzati dall’associazione
-- Collega ogni evento a una categoria tramite FOREIGN KEY

CREATE TABLE evento (
  id_evento SERIAL PRIMARY KEY,            -- ID evento autoincrementale
  titolo VARCHAR(255) NOT NULL,            -- Titolo evento (obbligatorio)
  categoria INTEGER NOT NULL               -- Collegamento alla categoria (tipologica)
    REFERENCES tipologiche(id_tipologica), -- FOREIGN KEY: relazione con tipologiche (campo id_tipologica)
  data_inizio DATE NOT NULL,               -- Data inizio evento
  data_fine DATE NOT NULL,                 -- Data fine evento
  orario_inizio TIME,                      -- Orario inizio (opzionale)
  orario_fine TIME,                        -- Orario fine (opzionale)
  luogo VARCHAR(255),                      -- Luogo dell’evento
  note TEXT,                               -- Note aggiuntive
  prezzo NUMERIC(10, 2),                   -- Prezzo in euro (es. 99.99) opzionale
  attivo BOOLEAN DEFAULT true,             -- Flag per indicare se l’evento è attivo (default true)
  creato_il TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Data e ora di creazione (default: momento attuale)
);

-- =============================
-- TABELLA CLIENTE_EVENTO
-- =============================
-- Tabella di relazione molti-a-molti tra clienti e eventi
-- Serve a registrare le iscrizioni dei clienti agli eventi

CREATE TABLE cliente_evento (
  id_cliente_evento SERIAL PRIMARY KEY,    -- ID univoco dell’iscrizione

  id_cliente INTEGER NOT NULL,             -- Cliente che si iscrive (campo obbligatorio)
  id_evento INTEGER NOT NULL,              -- Evento a cui è iscritto (campo obbligatorio)

  data_iscrizione TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Data/ora dell’iscrizione (di default: ora corrente)

  -- FOREIGN KEY: collega al cliente
  CONSTRAINT fk_cliente
    FOREIGN KEY (id_cliente)
    REFERENCES cliente (id_cliente)
    ON DELETE CASCADE,                     -- Se si elimina un cliente, vengono eliminate le sue iscrizioni

  -- FOREIGN KEY: collega all’evento
  CONSTRAINT fk_evento
    FOREIGN KEY (id_evento)
    REFERENCES evento (id_evento)
    ON DELETE CASCADE,                     -- Se si elimina un evento, vengono eliminate le iscrizioni collegate

  -- UNIQUE: garantisce che un cliente possa iscriversi una sola volta a uno stesso evento
  CONSTRAINT univoco_cliente_evento
    UNIQUE (id_cliente, id_evento)
);
