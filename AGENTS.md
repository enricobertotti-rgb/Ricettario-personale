# Sapore — istruzioni operative R20

## Destinazioni correnti
Repository pubblico enricobertotti-rgb/Ricettario-personale: soltanto app/ autosufficiente, reindirizzamento index.html e queste istruzioni. Repository privato enricobertotti-rgb/Sapore-Archivio-Privato: dati canonici, fonti, originali, curatela, revisioni, ricevute, manutenzione, prove e backup. Drive e documenti di migrazione sono storici: non usarli come destinazione operativa.

## Coordinamento
I lavori del flusso corrente autorizzati direttamente in chat procedono senza approvazioni nella dashboard. Orbita Control Room registra istruzioni, avanzamento, esecuzioni, test e limiti; non è un cancello autorizzativo. Restano obbligatorie le conferme native degli strumenti. Non assumere che un vecchio stato Pronta o In corso riattivi una chat.

## Prima delle modifiche
Leggere nel privato config/runtime-targets.json e docs/R20_REVISIONI_E_MANUTENZIONE.md, poi HEAD, job attivi, ledger, readiness, ricevute e ticket pertinenti. Snapshot e conteggi in vecchi documenti non rappresentano lo stato corrente. Ripartire dalla versione remota effettiva, preservare modifiche concorrenti. Per il software usare sapore-lavoro dopo verifica del suo stato; niente force push. Nessun secondo writer: dati canonici esclusivamente tramite inbox/requests e writer seriale R14.

## Identità e revisioni
ID stabili; fonte, variante e revisione sono concetti diversi. URL o titolo uguali non dimostrano duplicazione. Confrontare ingredienti/dosi, metodo, resa, tempi e temperature. Conservare originali e varianti autentiche, ciascuna con formula e metodo completi. Una correzione mantiene ID e storico, richiede il digest della versione precedente e nuova verifica editoriale. Mai inventare quantità o conversioni. Le immagini richiedono provenienza e diritti verificati; nessuna nuova foto incorporata dal publisher R20.

## Rilascio
Usare l'adattatore deterministico R20: resa e tempi integrali approvati, note e varianti visibili. Un solo rilascio attivo. Preparare tramite writer; costruire e provare l'artefatto completo nella CI R20, distribuire gli stessi byte e verificare build ID, digest e interfaccia online. Deploy riuscito non equivale a pubblicazione verificata. Ripristinare soltanto gli elementi coinvolti se un rilascio fallisce, conservando ricevute e originale.

## Collaudo e manutenzione
Provare ID/deep link (underscore inclusi), ricerca, Avanti/Indietro limitati ai risultati, categorie, Dispensa, stampa, metadati, note, varianti, desktop e mobile. Distinguere emulazione Chromium, WebKit e prova su dispositivo fisico. Ogni revisione ha causa, responsabile, prossima azione/data ed evidenza di chiusura. Una fonte incerta resta in attesa motivata; un difetto locale non spegne la raccolta delle altre ricette. Nessuna chiusura per il solo trascorrere del tempo. Aggiornare prove nel privato e registro Orbita; non pubblicare materiali di lavorazione in questo repository.
