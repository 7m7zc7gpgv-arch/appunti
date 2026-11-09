# I miei appunti

Web app gratuita, pensata per iPad e utilizzabile offline. I documenti restano nel browser del dispositivo tramite IndexedDB: non serve un account e non vengono inviati a un server.

## Funzioni già incluse

- cartelle e appunti con pagina bianca, a righe o a quadretti;
- disegno con penna, evidenziatore e gomma;
- più pagine per appunto, annulla/ripeti e rinomina automatica;
- esportazione tramite la finestra di stampa di iPad (da lì: **Condividi → Salva come PDF**);
- installazione come app dalla Home e uso offline dopo la prima apertura.

## Come averla sulla Home dell'iPad, senza spendere

Una PWA deve essere pubblicata con HTTPS per essere installabile. L'opzione gratuita più semplice è GitHub Pages:

1. Crea un account gratuito su GitHub.
2. Crea un nuovo repository pubblico, per esempio `miei-appunti`.
3. Carica il contenuto di questa cartella (non la cartella esterna `LAVORI CODEX`).
4. In GitHub vai in **Settings → Pages**, scegli **Deploy from a branch**, poi `main` e la cartella `/ (root)`.
5. Apri sul tuo iPad l'indirizzo che GitHub mostra, usando Safari.
6. In Safari tocca **Condividi → Aggiungi a Home** → **Aggiungi**.

L'app sarà visibile nella Home e si aprirà senza la barra del browser. I dati sono però locali a ciascun browser/dispositivo: questa versione non sincronizza automaticamente iPad e computer.

## Avvio locale sul PC

Puoi aprire `index.html` nel browser per provarla. Il funzionamento offline e l'installazione sulla Home richiedono invece il sito pubblicato in HTTPS.

