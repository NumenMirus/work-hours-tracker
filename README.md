# work-hours-tracker

Dashboard to record work hours to bill to clients

## Consuntivo

La pagina **Consuntivo** mostra le ore di un periodo (default: il mese in corso), con totale per
cliente e per giorno, e permette di filtrare per cliente. **Scarica CSV** esporta le stesse
registrazioni per Excel/LibreOffice: separatore `;`, UTF-8 con BOM, colonne
`Data;Cliente;Attività;Minuti;Ore` (ore decimali con la virgola) e in fondo i totali per cliente.
Le registrazioni eliminate non sono incluse.

## Sviluppo

Requisiti: Node >= 22.17.

```sh
cp .env.example .env   # imposta APP_PASSWORD (min 8 caratteri)
npm install
npm run dev
```

Comandi utili: `npm run check`, `npm run lint`, `npm run test:unit -- --run`, `npm run test:e2e`.

## Installazione su Proxmox (LXC Debian 13)

L'installazione avviene dentro il container, senza Docker: lo script scarica la
release da GitHub, scrive l'unit systemd e riavvia il servizio.

Prima di tutto serve un personal access token **fine-grained** con permesso
`Contents: Read-only` sul solo repository `NumenMirus/work-hours-tracker`
(sezione _Settings → Developer settings → Personal access tokens → Fine-grained
tokens_). Esportalo nella shell del container come `TOKEN`.

Prima installazione:

```sh
curl -fsSL -H "Authorization: Bearer $TOKEN" \
  https://raw.githubusercontent.com/NumenMirus/work-hours-tracker/main/deploy/install.sh \
  | sudo GITHUB_TOKEN="$TOKEN" bash
```

Aggiornamenti successivi (lo script si auto-installa in
`/usr/local/sbin/registro-ore-update` e rieseguibile, quindi idempotente):

```sh
sudo registro-ore-update
```

Se `/etc/registro-ore/registro-ore.env` non esiste ancora, la password viene
chieduta due volte durante la prima installazione; per unattended si può passare
`APP_PASSWORD=...` (min 8 caratteri). `PORT` (default `3000`) vale solo alla
prima installazione, poi viene letto dall'env file. `REGISTRO_VERSION=v0.1.0` installa un
tag preciso, `FORCE=1` reinstalla anche la versione già attiva.

Dove stanno le cose:

- configurazione e password: `/etc/registro-ore/registro-ore.env`
- token GitHub: `/etc/registro-ore/install.env`
- database SQLite: `/var/lib/registro-ore/registro-ore.sqlite`
- applicazione: `/opt/registro-ore/current` (le ultime 3 release in
  `/opt/registro-ore/releases`)
- log: `journalctl -u registro-ore -f`

Il database è coperto dai backup `vzdump` del container: non serve configurare
backup applicativi. Dopo l'installazione va configurato il reverse proxy perché
inoltrino `X-Forwarded-Proto`, `X-Forwarded-Host` e `X-Forwarded-For`, e si
accede solo via HTTPS.

### Pubblicare una release

Le release vengono costruite da GitHub Actions al push di un tag `v*`. Da un `main`
pulito e allineato con `origin`:

```sh
make release                  # patch: v0.1.1 -> v0.1.2
make release BUMP=minor       # v0.1.1 -> v0.2.0
make release VERSION=1.0.0    # versione esplicita
make release DRY_RUN=1        # solo controlli, nessun tag né push
```

`deploy/release.sh` verifica ramo, albero di lavoro e allineamento con `origin`,
esegue `check`, `lint` e test unitari, mostra i commit inclusi, chiede conferma,
crea il tag annotato, pusha `main` e il tag insieme e attende l'esito del workflow
con `gh` (se installato). `YES=1` salta la conferma, `SKIP_CHECKS=1` i controlli
locali, `WATCH=0` l'attesa.

Il workflow esegue `check`, `lint`, test unitari e build, poi allega alla release
`registro-ore-v0.1.0.tar.gz` (con `build/`, `drizzle/` e `VERSION`) e il relativo
file `.sha256`.
