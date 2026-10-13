#!/usr/bin/env bash
#
# Installazione e aggiornamento di "Registro ore" su bare metal (LXC Debian 13).
#
# Prima installazione, dentro il container:
#
#   curl -fsSL -H "Authorization: Bearer $TOKEN" \
#     https://raw.githubusercontent.com/NumenMirus/work-hours-tracker/main/deploy/install.sh \
#     | sudo GITHUB_TOKEN="$TOKEN" bash
#
# oppure, se lo script è stato copiato a mano:
#
#   sudo GITHUB_TOKEN="$TOKEN" bash install.sh
#
# Aggiornamenti successivi (lo script si è auto-copiato in
# /usr/local/sbin/registro-ore-update):
#
#   sudo registro-ore-update
#
# $TOKEN è un personal access token fine-grained con permesso
# "Contents: Read-only" sul solo repository NumenMirus/work-hours-tracker.
#
# Variabili d'ingresso:
#   GITHUB_TOKEN  necessaria alla prima installazione (poi salvata in
#                 /etc/registro-ore/install.env) e agli aggiornamenti se non è
#                 già salvata lì.
#   REGISTRO_VERSION  tag della release da installare (default: ultima release).
#   PORT          porta del servizio (default 3000); considerata solo alla
#                 prima installazione, poi letta da registro-ore.env.
#   APP_PASSWORD  password unica di accesso (min 8 caratteri). Se assente alla
#                 prima installazione viene richiesta due volte da /dev/tty; se
#                 passata durante un aggiornamento sostituisce quella salvata.
#   FORCE=1       reinstalla anche quando la release richiesta è già attiva.
#
# Lo script è idempotente: rieseguirlo aggiorna l'installazione.

set -euo pipefail

REPO="NumenMirus/work-hours-tracker"
SERVICE="registro-ore"
SERVICE_USER="registro-ore"
APP_ROOT="/opt/registro-ore"
RELEASES_DIR="$APP_ROOT/releases"
CURRENT_LINK="$APP_ROOT/current"
ETC_DIR="/etc/registro-ore"
APP_ENV_FILE="$ETC_DIR/registro-ore.env"
INSTALL_ENV_FILE="$ETC_DIR/install.env"
DATA_DIR="/var/lib/registro-ore"
UNIT_FILE="/etc/systemd/system/$SERVICE.service"
UPDATE_CMD="/usr/local/sbin/registro-ore-update"
KEEP_RELEASES=3
NODE_MAJOR_MIN=22
HEALTH_ATTEMPTS=20

TMP=''
TAG=''
TARBALL_ID=''
SHA_ID=''

log() {
	printf '%s\n' "$*"
}

warn() {
	printf 'Attenzione: %s\n' "$*" >&2
}

die() {
	printf 'Errore: %s\n' "$*" >&2
	exit 1
}

step() {
	log ''
	log "==> $*"
}

cleanup() {
	if [ -n "$TMP" ] && [ -e "$TMP" ]; then
		rm -rf "$TMP"
	fi
}

trap cleanup EXIT

# Legge il valore di una chiave (stile KEY=value) da un file env.
env_value() {
	local file=$1 key=$2 default=${3:-} value=''
	if [ -f "$file" ]; then
		value=$(sed -n "s/^${key}=//p" "$file" | tail -n 1)
	fi
	if [ -z "$value" ]; then
		value=$default
	fi
	printf '%s' "$value"
}

check_system() {
	if [ "$(id -u)" -ne 0 ]; then
		die "Esegui come root."
	fi
	if [ ! -f /etc/os-release ]; then
		die "Sistema operativo non riconosciuto: manca /etc/os-release."
	fi
	# In una subshell: os-release definisce anche VERSION ("13 (trixie)") e non deve inquinare
	# l'ambiente dello script.
	local os_id os_version_id
	# shellcheck disable=SC1091
	os_id=$(. /etc/os-release && printf '%s' "${ID:-}")
	# shellcheck disable=SC1091
	os_version_id=$(. /etc/os-release && printf '%s' "${VERSION_ID:-}")
	if [ "$os_id" != "debian" ]; then
		die "Installazione supportata solo su Debian (trovato ${os_id:-sconosciuto})."
	fi
	if [ "$os_version_id" != "13" ]; then
		warn "Versione Debian ${os_version_id:-sconosciuta} invece di 13: procedo, ma il supporto è verificato solo su Debian 13."
	fi
}

install_packages() {
	step 'Dipendenze di sistema'
	export DEBIAN_FRONTEND=noninteractive
	apt-get update
	apt-get install -y --no-install-recommends ca-certificates curl jq tar xz-utils
}

node_major() {
	local major=0
	if command -v node >/dev/null 2>&1; then
		major=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || printf '0')
	fi
	printf '%s' "${major:-0}"
}

install_node_from_tarball() {
	local arch node_arch tmp base file sum
	arch=$(dpkg --print-architecture)
	case "$arch" in
	amd64) node_arch=x64 ;;
	arm64) node_arch=arm64 ;;
	*)
		warn "Architettura $arch non gestita dal tarball ufficiale di Node."
		return 1
		;;
	esac
	tmp=$(mktemp -d)
	base="https://nodejs.org/dist/latest-v24.x"
	warn "NodeSource non ha un pacchetto per questa Debian: uso il tarball ufficiale da $base"
	if ! curl -fsSL "$base/SHASUMS256.txt" -o "$tmp/SHASUMS256.txt"; then
		rm -rf "$tmp"
		return 1
	fi
	file=$(awk -v suffix="-linux-$node_arch.tar.xz" 'index($2, suffix) { print $2; exit }' "$tmp/SHASUMS256.txt")
	sum=$(awk -v f="$file" '$2 == f { print $1; exit }' "$tmp/SHASUMS256.txt")
	if [ -z "$file" ] || [ -z "$sum" ]; then
		rm -rf "$tmp"
		return 1
	fi
	if ! curl -fsSL "$base/$file" -o "$tmp/node.tar.xz"; then
		rm -rf "$tmp"
		return 1
	fi
	if [ "$(sha256sum "$tmp/node.tar.xz" | awk '{ print $1 }')" != "$sum" ]; then
		rm -rf "$tmp"
		die 'Checksum del tarball di Node non valido.'
	fi
	rm -rf /opt/node
	mkdir -p /opt/node
	tar -xJf "$tmp/node.tar.xz" -C /opt/node --strip-components=1
	ln -sfn /opt/node/bin/node /usr/bin/node
	rm -rf "$tmp"
}

ensure_node() {
	local major
	major=$(node_major)
	if [ "${major:-0}" -ge "$NODE_MAJOR_MIN" ] 2>/dev/null; then
		log "Node già presente (major $major)."
		return 0
	fi
	step 'Node.js'
	if curl -fsSL https://deb.nodesource.com/setup_24.x | bash -; then
		export DEBIAN_FRONTEND=noninteractive
		if apt-get install -y nodejs; then
			return 0
		fi
	fi
	if ! install_node_from_tarball; then
		die "Installazione di Node.js non riuscita."
	fi
}

ensure_user() {
	step 'Utente e directory'
	if ! id -u "$SERVICE_USER" >/dev/null 2>&1; then
		useradd --system --home-dir "$DATA_DIR" --shell /usr/sbin/nologin "$SERVICE_USER"
		log "Utente di sistema $SERVICE_USER creato."
	fi
	install -d -m 755 "$APP_ROOT" "$RELEASES_DIR"
	install -d -m 750 -o "$SERVICE_USER" -g "$SERVICE_USER" "$DATA_DIR"
	install -d -m 750 -o root -g "$SERVICE_USER" "$ETC_DIR"
}

acquire_password() {
	local first='' second=''
	if [ -n "${APP_PASSWORD:-}" ]; then
		printf '%s' "$APP_PASSWORD"
		return 0
	fi
	if [ -f "$APP_ENV_FILE" ]; then
		printf '%s' "$(env_value "$APP_ENV_FILE" APP_PASSWORD)"
		return 0
	fi
	if [ -r /dev/tty ]; then
		printf 'Password di accesso al tool (min 8 caratteri): ' >/dev/tty
		IFS= read -r -s first </dev/tty || die "Password non letta."
		printf '\nRipeti la password: ' >/dev/tty
		IFS= read -r -s second </dev/tty || die "Password non letta."
		printf '\n' >/dev/tty
		[ "$first" = "$second" ] || die "Le due password non coincidono."
		printf '%s' "$first"
		return 0
	fi
	die "Imposta APP_PASSWORD."
}

write_install_env() {
	local token=$1 tmp
	tmp=$(mktemp)
	if [ -f "$INSTALL_ENV_FILE" ]; then
		grep -v '^GITHUB_TOKEN=' "$INSTALL_ENV_FILE" >"$tmp" || true
	fi
	printf 'GITHUB_TOKEN=%s\n' "$token" >>"$tmp"
	install -m 600 -o root -g root "$tmp" "$INSTALL_ENV_FILE"
	rm -f "$tmp"
}

write_app_env() {
	local password=$1 port=$2 tmp
	if [ -f "$APP_ENV_FILE" ]; then
		if [ -n "$password" ]; then
			tmp=$(mktemp)
			grep -v '^APP_PASSWORD=' "$APP_ENV_FILE" >"$tmp" || true
			printf 'APP_PASSWORD=%s\n' "$password" >>"$tmp"
			cat "$tmp" >"$APP_ENV_FILE"
			rm -f "$tmp"
			chown root:"$SERVICE_USER" "$APP_ENV_FILE"
			chmod 640 "$APP_ENV_FILE"
			log "Password aggiornata in $APP_ENV_FILE."
		fi
		return 0
	fi
	cat >"$APP_ENV_FILE" <<EOF
APP_PASSWORD=$password
DATABASE_PATH=$DATA_DIR/registro-ore.sqlite
APP_TIME_ZONE=Europe/Rome
HOST=0.0.0.0
PORT=$port
PROTOCOL_HEADER=x-forwarded-proto
HOST_HEADER=x-forwarded-host
ADDRESS_HEADER=X-Forwarded-For
XFF_DEPTH=1
EOF
	chown root:"$SERVICE_USER" "$APP_ENV_FILE"
	chmod 640 "$APP_ENV_FILE"
	log "Configurazione scritta in $APP_ENV_FILE."
}

install_self() {
	local source_url tmp
	source_url="https://api.github.com/repos/$REPO/contents/deploy/install.sh"
	if [ -f "$0" ] && [ -r "$0" ] && [ "$0" != "bash" ] && [ "$0" != "sh" ]; then
		# Lanciato come registro-ore-update: la sorgente e la destinazione coincidono, niente da copiare.
		if [ "$(readlink -f "$0")" = "$(readlink -f "$UPDATE_CMD" 2>/dev/null || true)" ]; then
			return 0
		fi
		install -m 755 "$0" "$UPDATE_CMD"
		log "Script di aggiornamento copiato in $UPDATE_CMD."
		return 0
	fi
	tmp=$(mktemp)
	if [ -n "${GITHUB_TOKEN:-}" ] &&
		curl -fsSL -H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github.raw+json" "$source_url" -o "$tmp"; then
		install -m 755 "$tmp" "$UPDATE_CMD"
		log "Script di aggiornamento scaricato in $UPDATE_CMD."
	else
		warn "Non riesco a preparare $UPDATE_CMD: copialo a mano con 'install -m 755 deploy/install.sh $UPDATE_CMD'."
	fi
	rm -f "$tmp"
}

resolve_release() {
	local api
	if [ -n "${REGISTRO_VERSION:-}" ]; then
		api="https://api.github.com/repos/$REPO/releases/tags/$REGISTRO_VERSION"
	else
		api="https://api.github.com/repos/$REPO/releases/latest"
	fi
	TMP=$(mktemp -d)

	local status
	status=$(curl -sSL -o "$TMP/release.json" -w '%{http_code}' \
		-H "Authorization: Bearer $GITHUB_TOKEN" \
		-H "Accept: application/vnd.github+json" "$api" 2>"$TMP/curl.err") || status=000
	case "$status" in
	200) ;;
	000) die "Impossibile raggiungere api.github.com: $(cat "$TMP/curl.err")" ;;
	401) die "GitHub risponde 401: token scaduto, revocato o copiato male." ;;
	403) die "GitHub risponde 403: token senza permessi o limite di richieste raggiunto." ;;
	404) die "GitHub risponde 404: release inesistente oppure il token non vede il repo (serve 'Contents: Read-only' sul repo $REPO, scelto fra i repository del token)." ;;
	*) die "GitHub risponde HTTP $status." ;;
	esac
	TAG=$(jq -r '.tag_name // empty' "$TMP/release.json")
	[ -n "$TAG" ] || die "Risposta inattesa dall'API GitHub: tag mancante."
	TARBALL_ID=$(jq -r '. as $r | ($r.assets[] | select(.name == ("registro-ore-" + $r.tag_name + ".tar.gz")) | .id)' "$TMP/release.json")
	SHA_ID=$(jq -r '. as $r | ($r.assets[] | select(.name == ("registro-ore-" + $r.tag_name + ".tar.gz.sha256")) | .id)' "$TMP/release.json")
	if [ -z "$TARBALL_ID" ] || [ "$TARBALL_ID" = 'null' ] ||
		[ -z "$SHA_ID" ] || [ "$SHA_ID" = 'null' ]; then
		die "La release $TAG non contiene gli asset registro-ore-$TAG.tar.gz e registro-ore-$TAG.tar.gz.sha256."
	fi
}

download_release() {
	local target
	log "Scarico registro-ore-$TAG.tar.gz."
	curl -fsSL -H "Authorization: Bearer $GITHUB_TOKEN" \
		-H "Accept: application/octet-stream" \
		"https://api.github.com/repos/$REPO/releases/assets/$TARBALL_ID" -o "$TMP/registro-ore-$TAG.tar.gz"
	curl -fsSL -H "Authorization: Bearer $GITHUB_TOKEN" \
		-H "Accept: application/octet-stream" \
		"https://api.github.com/repos/$REPO/releases/assets/$SHA_ID" -o "$TMP/registro-ore-$TAG.tar.gz.sha256"

	log 'Verifico il checksum.'
	# shellcheck disable=SC2164
	(cd "$TMP" && sha256sum -c "registro-ore-$TAG.tar.gz.sha256") ||
		die 'Checksum non valido: il download è corrotto.'

	target="$RELEASES_DIR/$TAG"
	rm -rf "$target"
	mkdir -p "$target"
	log "Estraggo in $target."
	tar -xzf "$TMP/registro-ore-$TAG.tar.gz" -C "$target" --strip-components=1
	if [ ! -d "$target/drizzle" ]; then
		die "Archivio non valido: manca la cartella drizzle con le migrazioni."
	fi
	if [ ! -f "$target/VERSION" ]; then
		die 'Archivio non valido: manca il file VERSION.'
	fi
	if [ ! -f "$target/package.json" ]; then
		die 'Archivio non valido: manca package.json.'
	fi
	if [ ! -d "$target/build" ]; then
		die "Archivio non valido: manca il build dell'applicazione."
	fi
}

write_unit() {
	step 'Unit systemd'
	cat >"$UNIT_FILE" <<EOF
[Unit]
Description=Registro ore
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$CURRENT_LINK
EnvironmentFile=$APP_ENV_FILE
ExecStart=/usr/bin/node build
Restart=on-failure
RestartSec=3
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF
	systemctl daemon-reload
}

switch_release() {
	local new_link="$CURRENT_LINK.new"
	ln -sfn "releases/$TAG" "$new_link"
	mv -T "$new_link" "$CURRENT_LINK"
	log "Attivata la release $TAG."
	systemctl enable "$SERVICE" >/dev/null
	systemctl restart "$SERVICE"
}

health_check() {
	local port=$1 attempt
	for attempt in $(seq 1 "$HEALTH_ATTEMPTS"); do
		if curl -fsS -o /dev/null "http://127.0.0.1:$port/login"; then
			return 0
		fi
		sleep 1
	done
	return 1
}

rollback() {
	local previous=$1 new_link="$CURRENT_LINK.prev"
	if [ -z "$previous" ] || [ ! -d "$previous" ]; then
		return 0
	fi
	warn "Ripristino la release precedente ($(basename "$previous"))."
	ln -sfn "$previous" "$new_link"
	mv -T "$new_link" "$CURRENT_LINK"
	systemctl restart "$SERVICE" || true
}

prune_releases() {
	local dir
	while IFS= read -r dir; do
		[ -n "$dir" ] || continue
		log "Rimuovo $dir."
		rm -rf "$dir"
	done < <(ls -1dt "$RELEASES_DIR"/*/ 2>/dev/null | tail -n +"$((KEEP_RELEASES + 1))")
}

summary() {
	local port=$1 ips
	ips=$(hostname -I 2>/dev/null | awk '{print $1}')
	log ''
	log 'Installazione completata.'
	log "  Versione:  $TAG"
	log "  Indirizzo del servizio (solo per il reverse proxy): http://${ips:-<ip del container>}:$port"
	log '  Aggiornamento successivo: sudo registro-ore-update'
	log ''
	log 'Promemoria: punta il reverse proxy a questo indirizzo e fai sì che inoltri'
	log 'X-Forwarded-Proto e X-Forwarded-Host, e che AGGIUNGA alla catena X-Forwarded-For'
	log "l'IP del client (XFF_DEPTH=1 = un solo proxy fidato davanti all'app: se ne hai due, alza"
	log 'XFF_DEPTH in /etc/registro-ore/registro-ore.env). Il login funziona solo via HTTPS sul proxy:'
	log "aprire direttamente l'indirizzo qui sopra non permette l'accesso."
	log "Il database è in $DATA_DIR ed è coperto dai backup vzdump del container."
}

main() {
	local password port previous current

	check_system
	install_packages
	ensure_node
	ensure_user

	if [ -z "${GITHUB_TOKEN:-}" ] && [ -f "$INSTALL_ENV_FILE" ]; then
		GITHUB_TOKEN=$(env_value "$INSTALL_ENV_FILE" GITHUB_TOKEN)
	fi
	if [ -z "${GITHUB_TOKEN:-}" ]; then
		die "GITHUB_TOKEN non impostata: serve un PAT fine-grained con permesso Contents: Read-only sul repository $REPO."
	fi
	step 'Token GitHub'
	if [ -f "$INSTALL_ENV_FILE" ] && [ "$(env_value "$INSTALL_ENV_FILE" GITHUB_TOKEN)" = "$GITHUB_TOKEN" ]; then
		log "Token già salvato in $INSTALL_ENV_FILE."
	else
		write_install_env "$GITHUB_TOKEN"
		log "Token salvato in $INSTALL_ENV_FILE."
	fi

	password=$(acquire_password)
	if [ "${#password}" -lt 8 ]; then
		die 'La password deve avere almeno 8 caratteri.'
	fi
	write_app_env "$password" "${PORT:-3000}"
	password=''
	port=$(env_value "$APP_ENV_FILE" PORT "${PORT:-3000}")

	previous=''
	current=''
	if [ -L "$CURRENT_LINK" ]; then
		current=$(readlink -f "$CURRENT_LINK" || true)
		previous=$current
	fi

	step 'Release'
	resolve_release
	if [ "${FORCE:-0}" != "1" ] && [ -n "$current" ] &&
		[ "$current" = "$RELEASES_DIR/$TAG" ]; then
		log "Già alla versione $TAG."
		install_self
		summary "$port"
		exit 0
	fi

	download_release
	install_self
	write_unit
	switch_release

	step 'Verifica del servizio'
	if health_check "$port"; then
		log "Il servizio risponde su http://127.0.0.1:$port/login."
	else
		rollback "$previous"
		systemctl status "$SERVICE" --no-pager || true
		journalctl -u "$SERVICE" -n 50 --no-pager || true
		die 'Il servizio non risponde dopo l’avvio.'
	fi

	prune_releases
	summary "$port"
}

main "$@"
