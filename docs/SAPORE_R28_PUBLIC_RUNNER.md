# SAPORE R28 — writer seriale privato eseguito da runner pubblico

**Stato al 21 novembre 2026: installato ma NON attivato.** Questo documento non è una prova di esecuzione del workflow; le scritture canoniche non sono state trasferite. Nessun dato editoriale o storico va copiato in questo repository.

## Perché
Il repository privato `enricobertotti-rgb/Sapore-Archivio-Privato` resta l'unica sede dei dati operativi. Il repository pubblico `enricobertotti-rgb/Ricettario-personale` ospita solamente il workflow di esecuzione; GitHub Actions sui runner standard pubblici non consuma la quota delle esecuzioni private. Il motore resta **tools/r14_inbox.py** del privato, con ledger, audit, R26 e Git CAS.

## Sicurezza e capacità
- Workflow: `.github/workflows/sapore-private-writer-public-runner.yml`.
- È attivabile manualmente in modalità `audit` (sola lettura) e, **solo dopo il cutover**, `apply`; la programmazione 6 volte al giorno è inizialmente bloccata dalla variabile `SAPORE_R28_ENABLED`.
- Eventi `pull_request`, `push`, fork e commenti **non** lanciano il writer. Il job richiede `main` e repository esatto.
- Non pubblicare token, ricette private, originali, log, screenshot, esportazioni né artefatti del checkout privato. I dettagli del writer sono soppressi nei log pubblici; i runner sono effimeri.
- Un solo writer logico è obbligatorio. **Il lock Actions NON è condiviso fra due repository.** Non attivare contemporaneamente il vecchio writer privato automatico e R28.
- Accesso segreto GitHub Actions nel repository pubblico: nome **`SAPORE_PRIVATE_WRITER_TOKEN`**, idealmente PAT fine-grained a scadenza breve, selezionato SOLTANTO per `Sapore-Archivio-Privato` con `Contents: Read and write` e `Commit statuses: Read and write`; `Metadata: Read` è implicito. Non incollare il token in chat o nel codice.
- Il PAT ha il potere di scrivere nel privato. Il codice del workflow pubblico va protetto da modifiche non revisionate. Dopo il cutover, preferire un GitHub App con token di installazione temporaneo se disponibile.
- `GITHUB_TOKEN` del pubblico NON ha accesso al privato. Il workflow usa il token dedicato soltanto per il checkout/push e l'attestazione della commit status privata.
- L'attestazione R28 è un **commit status privato** con contesto `sapore/public-runner-writer-r28` e link alla run pubblica, NON il vecchio check-run GitHub App `Sapore - verified writer commit R18`. Adeguare i controlli di Curatore, Pubblicatore e diagnostica alla distinzione prima di spostare il carico di lavoro. La sola run verde del workflow pubblico non equivale a ricetta pubblicata online.

## Attivazione controllata (passi ordinati)
1. Creare un token fine-grained limitato al privato in GitHub > Settings > Developer settings > Personal access tokens. Aggiungere il secret **SAPORE_PRIVATE_WRITER_TOKEN** in `Ricettario-personale > Settings > Secrets and variables > Actions > Secrets`. Non condividere il valore altrove.
2. In `Ricettario-personale > Actions > Sapore - private serial writer on public runner R28`, avviare `Run workflow` su `main`, `mode=audit` e, opzionalmente, `expected_private_head` attuale. Verificare la run completa, accesso solo al privato, audit e ledger senza scritture. Se fallisce, STOP.
3. Verificare che il privato non abbia job writer in corso. **Disattivare il trigger automatico del vecchio writer privato** (`.github/workflows/sapore-serial-writer.yml`) lasciando una possibilità di rollback manuale. Verificare che il nuovo stato sia effettivo. Il vecchio writer non deve ripartire automaticamente al reset del budget.
4. Aggiornare le istruzioni delle quattro automazioni e i controlli su R18/R28 mantenendo il writer unico, i 3 stati distinti e il divieto di pubblicare senza Pages + QA. Non creare task concorrenti.
5. Solo allora impostare la **repository variable** `SAPORE_R28_ENABLED=true` in `Ricettario-personale > Settings > Secrets and variables > Actions > Variables`.
6. Eseguire `mode=apply` una sola volta su `main`; controllare run, SHA esatto del privato, commit status R28, ricevute, integrità canonica, assenza di artefatti privati pubblici e zero esecuzioni concorrenti. Se non ci sono richieste non si crea un nuovo commit.
7. Con almeno un `apply` verificato, lasciare la schedulazione 6 volte/giorno: 01:17, 05:17, 09:17, 13:17, 17:17, 21:17 **UTC** (non Europe/Rome: gli orari locali variano con l'ora legale). Un ritardo delle schedule GitHub è possibile. I processi di raccolta/curatela/pubblicazione devono verificare le ricevute, non presumere la puntualità.
8. Prova end-to-end su una **sola richiesta già autorizzata**, con deduplica e CAS; test Pages + QA sul commit pubblico, poi ledger `published_verified` con prova. Nessun rilascio reale è stato eseguito da questa installazione.

## Rollback e blocchi
- Per fermare R28: impostare `SAPORE_R28_ENABLED=false` e verificare assenza di run attive. Una run già avviata non viene annullata dalla sola modifica della variabile; attendere il suo esito.
- Riattivare il vecchio trigger **solo dopo aver fermato R28** e verificato nuova capacità privata, stato inbox, SHA HEAD, ricevute e ledger. Evitare rollback parziali al solo JSON o solo runtime.
- In caso di errore: nessun force-push, nessun retry illimitato, preservare la coda. Il codice prova al massimo tre push CAS, come R14. Non inventare attestazioni. Il PAT scaduto o non autorizzato blocca il job.
- `R26 archive_activate` resta un'operazione distinta e richiede test dedicati, ricevute/readback, equivalenza dei file e rollback coordinato; la presenza del trasporto pubblico **non** certifica il master unico.
- Se manca la secret, **non** attivare la variabile: i run manuali audit falliranno in modo esplicito, quelli schedulati resteranno skipped.

## Riferimenti
- Privato: `config/runtime-targets.json`, `docs/R26_STATO.json`, `docs/R26_CONTRATTO_OPERATIVO.md`, `docs/R18_PREFLIGHT_CONTINUITY.md`, `tools/r14_inbox.py`.
- Pubblico: `.github/workflows/sapore-public-qa.yml`.
- Orbita Control Room: https://orbita-control-room.enber.chatgpt.site.

**Questa è una preparazione installata, non una certificazione del cutover.**
