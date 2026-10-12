# Istruzioni — v2

## Ambito della versione

Questa versione raccoglie i requisiti concordati nella conversazione per la registrazione delle attività e delle ore giornaliere. Il file originale non è disponibile in questa sessione: eventuali altre sezioni del documento precedente non sono riprodotte.

## Obiettivo

Permettere la registrazione rapida del tempo dedicato alle attività, privilegiando l'aggiunta diretta di una durata al totale della giornata. Il timer deve essere disponibile, ma non deve essere la modalità principale, perché l'utente potrebbe dimenticare di fermarlo.

## 1. Task rapide configurabili

L'utente deve poter creare, modificare ed eliminare task rapide. Ogni task rapida deve avere:

- Un nome dell'attività.
- Una durata predefinita.

Esempi:

- Assistenza: +20 minuti.
- Controllo turni: +1 ora.

## 2. Aggiunta diretta alla giornata — modalità principale

Quando l'utente seleziona una task rapida:

1. Il sistema registra il nome dell'attività e la durata associata nella giornata di riferimento.
2. La durata viene aggiunta al totale delle ore di quella giornata.
3. Non viene avviato alcun timer.
4. Non è richiesta alcuna successiva azione di arresto o chiusura dell'attività.

Il simbolo “+” indica un incremento del tempo registrato nella giornata, non il calcolo di un orario di fine a partire da un orario di inizio.

Ogni selezione costituisce una registrazione distinta: la stessa task può essere aggiunta più volte nella giornata.

## 3. Inserimento manuale

Deve essere possibile registrare un'attività indicando manualmente nome e durata, anche senza creare una task rapida. La durata inserita viene aggiunta al totale della giornata.

## 4. Timer opzionale — modalità secondaria

Deve essere disponibile un timer per misurare il tempo effettivo di un'attività.

- Il timer deve essere avviato esplicitamente dall'utente.
- La selezione ordinaria di una task rapida non deve avviare il timer.
- Il timer non deve essere il percorso predefinito di registrazione.
- Alla chiusura del timer, il tempo misurato viene registrato per l'attività e aggiunto al totale della giornata, senza duplicare il tempo già contabilizzato.
- Deve essere possibile correggere la durata se l'utente dimentica di fermare il timer.

## 5. Correzione delle registrazioni

L'utente deve poter:

- Annullare un'aggiunta effettuata per errore.
- Modificare la durata di una singola registrazione.
- Correggere una registrazione generata dal timer.

La modifica della durata di una singola registrazione non deve modificare la durata predefinita della task rapida. Qualsiasi correzione deve aggiornare coerentemente il totale giornaliero.

## 6. Priorità del flusso di utilizzo

1. Task rapida con aggiunta immediata della durata.
2. Inserimento manuale di attività e durata.
3. Timer opzionale avviato esplicitamente.

Il flusso principale deve consentire di scegliere l'attività e aggiungere subito il tempo, senza lasciare un timer in esecuzione.

## 7. Criteri di accettazione

- Selezionando “Assistenza”, vengono aggiunti 20 minuti alla giornata e non parte alcun timer.
- Selezionando “Controllo turni”, viene aggiunta 1 ora alla giornata e non parte alcun timer.
- Selezionando entrambe le task, il totale della giornata aumenta di 1 ora e 20 minuti.
- È possibile creare, modificare ed eliminare le definizioni delle task rapide.
- È possibile registrare un'attività con nome e durata manuali.
- Annullando una registrazione, il suo contributo viene rimosso dal totale giornaliero.
- Modificando una registrazione, il totale giornaliero riflette la nuova durata e la durata predefinita della task resta invariata.
- Il timer è disponibile solo come scelta esplicita e il tempo registrato può essere corretto.
