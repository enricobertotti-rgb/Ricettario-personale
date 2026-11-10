# Sapore — Contratto di indipendenza dell'app

## Vincolo inderogabile
La versione pubblicata deve mantenere esattamente HTML, CSS, JS, contenuti e comportamento della versione originale. L'app deve funzionare usando esclusivamente i file presenti in `app/` (oltre ai servizi web esterni già usati dalla versione originale).

## File runtime verificati (copia bit-per-bit, SHA Git identici)
- `app/index.html` — identico a `index.html` originale; blob `721804e7bd0fb3e10d6081114d3e64a443db8a7f`
- `app/data/drive-photos-1.json` — blob `05ba50c03237a3a33acda257ba4f0b883c3bb317`
- `app/data/drive-photos-2.json` — blob `b11cf89df0a4334de19bf1c4ab95401714527779`
- `app/data/drive-photos-3.json` — blob `083941c8e97c71bb748960289a31e971166f2ad2`
- `app/data/drive-photos-4.json` — blob `d378d6115f23addda7a7b5ed082ba49e061eec34`
- `app/data/drive-photos-5.json` — blob `e6762c14dbc7b5c7a9ff58f4b39b28cb61bd875c`

## Audit statico eseguito
- Il documento HTML non importa script o CSS esterni tramite tag `script src` o `link href`.
- L'unica chiamata `fetch(...)` nel codice usa `entry.bundle` per caricare i cinque file `data/drive-photos-N.json`.
- I cinque JSON sono validi e sono presenti sotto `app/data/`.
- I 47 riferimenti alle fotografie nel codice risolvono a 45 chiavi distinte, tutte presenti nei JSON (10+10+10+10+5); nessuna chiave mancante.
- Le ricette e i dati editoriali già usati dalla pagina sono incorporati nell'HTML corrente.
- Nessuna modifica è stata applicata ai sei file runtime.

## Limiti delle verifiche
I test statici e l'identità SHA non sostituiscono una prova reale in browser con un server HTTP. Non è stata ancora verificata la configurazione di GitHub Pages né la navigazione end-to-end su iPhone/iPad. Non dichiarare completata la migrazione di produzione prima di tali prove.

## Pubblicazione sicura
1. Pubblicare la cartella `app/` come **document root** tramite un hosting che consenta la selezione della directory (ad es. workflow di deploy GitHub Pages), senza cambiare alcun byte dei sei file runtime.
2. Se si mantiene GitHub Pages dalla radice, NON cancellare il vecchio `index.html` e `data/` finché non è configurata e collaudata una pubblicazione che usa `app/`.
3. Testare categorie, ricerca live, filtri ingredienti, ricette, navigazione avanti/indietro, foto, visualizzazione mobile/tablet e URL pubblico.
4. Verificare che il deployment funzioni senza la directory `lavorazione/`.
5. Solo dopo approvazione dei test, aggiornare le automazioni che scrivono in `data/` e procedere con la rimozione delle copie obsolete.

## Separazione editoriale
`lavorazione/dati-originali/` e `lavorazione/layout/` sono copie conservative dei file precedenti. Non sono dipendenze runtime. Non cancellare lotti o audit prima della riconciliazione dei record e della verifica delle automazioni attive.
