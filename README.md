<div align="center">

# 🎖️ Axis Companion: The Command Center

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Zustand](https://img.shields.io/badge/Zustand-764ABC?style=for-the-badge&logo=react&logoColor=white)](https://github.com/pmndrs/zustand)
<br>
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![PM2](https://img.shields.io/badge/PM2-2B037A?style=for-the-badge&logo=pm2&logoColor=white)](https://pm2.keymetrics.io/)

<br>

**Un'applicazione web asincrona real-time pensata per digitalizzare la complessa macroeconomia e lo storico operativo delle partite da tavolo a _Axis & Allies: 1942 Second Edition_.**

</div>

---

## 🧭 Panoramica Architetturale Generale

Il progetto adotta un approccio **Monorepo** con un'impalcatura fortemente asincrona, governata in tempo reale. Non essendoci refresh della pagina e basandosi l'intero state management su WebSockets full-duplex, i giocatori vedono le schede nazione (fondi, complessi industriali, danni strutturali, code di produzione) aggiornarsi istantaneamente tra i loro dispositivi tablet e telefoni non appena avvengono le operazioni.

Il **Backend Server** (Express) agisce in una duplice veste tecnica: fornisce le API WebSocket persistendo i dati su file fisico SQLite e funge anche da **Static Web Server** per servire nativamente i _bundle_ pre-compilati di React.

---

## <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" width="24" height="24" align="center" /> Il Frontend (Visualizzazione Logica)

Sviluppato impiegando il Modern React Stack (`Vite`, `React Hooks`, `TailwindCSS` per stilizzazione utility-first pura ispirata al modern-vintage militare).

### L'Albero dei Componenti Visivi (`/frontend/src/components/`)

- **`LobbyScreen.jsx`**: Punto di ingresso isolato dall'infrastruttura di gioco. Esegue `fetchRooms` esposte via RestAPI, garantisce il meccanismo di protezione per gli ambienti protetti (`master_password`) con feedback di connessione diretta col server.
- **`NationCard.jsx`**: Il controller primario di interazione del giocatore. Gestisce le transazioni:
  - **Calcoli Capacità Fabbriche**: Itera su `nation.purchases` aggregando i dati correnti coi tetti di base dati da `nation.factories.capacity` deducendo in live i malus di `factory.damage`.
  - **Combat Modali In-App**: Inserisce l'interfaccia condizionale assoluta per la spoliazione bancaria e la sottrazione del target _Income_ per conquista territoriale.
- **`MiniNationCard.jsx`**: Modulo minimale e destrutturato adoperato per creare a griglia i report globali per i player avversari, permettendo la supervisione totale del tavolo in sola lettura.

### Gestione Globale dello Stato (`/frontend/src/store/gameStore.js`)

Abbiamo depennato l'eccesso logico di Context Providers adottando **Zustand**. Il _gameStore_ funge sia da Memoria di Frontiera che da Dispatcher dei socket:

- **`Persistenza Locale`**: Anziché perdere il filo in caso di crash o blocco browser, rilegge attivamente `localStorage.getItem('axis_role')` re-inoltrando automaticamente il join e mascherando la riconnessione dietro le quinte.
- **`Gestore Eventi WebHooks`**: I socket `socket.emit('updateNation')` e derivati per conquiste/fabbriche non invadono la UI, sono relegati ad azioni pulite nello store.

---

## <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" width="24" height="24" align="center" /> Il Backend Server

Il nucleo affidabile implementato integralmente nello script `server.js` con un accesso nativo isolato in `db.js`. Non fa uso degli ORM per massimizzare le performance e l'accesso concorrenziale puro SQLite ad elevato traffico di payload WebSocket.

### `server.js` - Routing Socket Avanzato

Fornisce il re-broadcast ottimizzato tramite stanza `io.to(gameId).emit()`.

- **Mitigazioni Concorrenza (Smart Play-time)**: Se il socket disconnette, cattura il `Date.now()` di allontanamento calcolando nativamente i secondi spesi senza poller client. Al `joinGame` ripristina la progressione decifrando i blocchi di assenza utente.
- **RestAPI Gateway**: Esposizione base al routing HTTPS con `express.static(...)` per inviare il _build_ React prodotto da `/frontend/dist`.
- **Security Check**: Header limitati da `helmet` e prelievo di sessioni fantasma limitato su `/api/` grazie a `express-rate-limit`.

### `db.js` - Le Transazioni SQLite Dirette

Gestisce istanze multiple concorrenti di aggiornamenti:

- **Calcolo Dinamico dei Danni Strutturali (`updateFactoryDamage`)**: Il DB esegue controlli logici durante un `REPAIR` della fabbrica, sottraendo IPC se e solo se la Banca asincrona lo permette (`bank < cost => REJECT`).
- **Trasferimento Dinamico Infrastrutture (`transferFactory`)**: Una macro-query sposta interi oggetti JSON di una fabbrica dalla cella nativa a quella conquistatrice con reset calcolato del contatore `repairedThisTurn`.
- **Pulizia del Data-leakage**: Nel processo d'avvio (`initDb`), pulisce qualsiasi istanza malformata lasciata pendente da interruzioni fatali della macchina di servizio.

### `gameConfig.js` - Isolamento Configurazione Hard-coded

Tutti i valori deterministici della _"Second Edition 1942"_ sono distaccati dalla logica di persistenza:

- **Income Pre-impostato**: `USSR(24)`, `Germany(41)`, `UK(31)`, `Japan(30)`, `USA(42)`.
- **Compliance delle Fabbriche USA e Asse**: Configurate esattamente in IPC value di restrizione al territorio ospite (Es. `Eastern US -> Capacity 12`).

---

## 🖥 Guida Operativa di Deploy: Ambiente in Produzione

Poiché l'Applicazione Backend serve nativamente i build compilati (nessun server intermedio dev è richiesto in uso finale), si utilizza il robusto unificatore `PM2` per clusterizzare l'avvio in background del processo di Node:

```html
<!-- 1. Acquisizione degli asset ottimizzati per l'interfaccia React -->
<kbd>cd frontend</kbd>
<kbd>npm run build</kbd>

<!-- 2. Bootstrap definitivo del Cluster tramite process manager PM2 -->
<kbd>cd ../backend</kbd>
<kbd>pm2 start server.js --name "axis-companion"</kbd>

<!-- 3. Sigillo del dump per garantire l'avvio al prossimo boot fisico della macchina linux -->
<kbd>pm2 save</kbd>
```
