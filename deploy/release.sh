#!/usr/bin/env bash
# Pubblica una release di "Registro ore": controlla, crea il tag e lo pusha.
# Il resto lo fa .github/workflows/release.yml (build + tar.gz + GitHub Release).
#
# Uso (di solito via `make release`):
#
#   deploy/release.sh [patch|minor|major|X.Y.Z]     (default: patch)
#
# Variabili d'ambiente:
#   DRY_RUN=1      esegue tutti i controlli e mostra cosa farebbe, senza tag né push.
#   SKIP_CHECKS=1  salta check/lint/unit locali (la CI li esegue comunque).
#   YES=1          non chiede conferma.
#   WATCH=0        non attende l'esito del workflow dopo il push.

set -euo pipefail

BRANCH=main
REMOTE=origin

log() { printf '==> %s\n' "$*"; }
die() {
	printf 'Errore: %s\n' "$*" >&2
	exit 1
}

cd "$(git rev-parse --show-toplevel)"

bump=${1:-patch}

[ "$(git rev-parse --abbrev-ref HEAD)" = "$BRANCH" ] || die "devi essere sul ramo $BRANCH."
[ -z "$(git status --porcelain)" ] || die "ci sono modifiche non committate: committa o rimuovile prima."

log "Allineamento con $REMOTE"
git fetch --quiet --tags "$REMOTE" "$BRANCH"
remote_head=$(git rev-parse "$REMOTE/$BRANCH")
if ! git merge-base --is-ancestor "$remote_head" HEAD; then
	die "$BRANCH locale non contiene $REMOTE/$BRANCH: esegui 'git pull --rebase' e riprova."
fi

last=$(git tag --list 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | sed -n 1p)
last=${last:-v0.0.0}
IFS=. read -r major minor patch <<<"${last#v}"

case "$bump" in
patch) next="v$major.$minor.$((patch + 1))" ;;
minor) next="v$major.$((minor + 1)).0" ;;
major) next="v$((major + 1)).0.0" ;;
v[0-9]*.[0-9]*.[0-9]* | [0-9]*.[0-9]*.[0-9]*) next="v${bump#v}" ;;
*) die "argomento non valido '$bump': usa patch, minor, major oppure X.Y.Z." ;;
esac
[[ $next =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "versione non valida: $next."
git rev-parse --quiet --verify "refs/tags/$next" >/dev/null && die "il tag $next esiste già."
if [ "$last" != v0.0.0 ] && [ "$(printf '%s\n%s\n' "$last" "$next" | sort -V | sed -n 1p)" != "$last" ]; then
	die "$next non è successiva all'ultima release $last."
fi

if [ "$last" != v0.0.0 ] && [ "$(git rev-parse "$last^{commit}")" = "$(git rev-parse HEAD)" ]; then
	die "nessun commit dopo $last: niente da rilasciare."
fi

log "Release $last -> $next"
if [ "$last" = v0.0.0 ]; then
	git log --oneline
else
	git log --oneline "$last..HEAD"
fi

if [ "${SKIP_CHECKS:-0}" != 1 ]; then
	log 'Controlli locali (gli stessi della CI)'
	npm run check
	npm run lint
	npm run test:unit -- --run
fi

if [ "${DRY_RUN:-0}" = 1 ]; then
	log "DRY_RUN: avrei creato il tag $next e pushato $BRANCH e $next su $REMOTE."
	exit 0
fi

if [ "${YES:-0}" != 1 ]; then
	read -r -p "Creare il tag $next e pushare $BRANCH + $next su $REMOTE? [s/N] " answer
	case "$answer" in
	s | S | si | SI | y | Y) ;;
	*) die 'annullato.' ;;
	esac
fi

log "Tag $next e push"
git tag -a "$next" -m "Registro ore $next"
if ! git push --atomic "$REMOTE" "$BRANCH" "$next"; then
	git tag -d "$next" >/dev/null
	die 'push fallito: il tag locale è stato rimosso, nulla è stato pubblicato.'
fi

if [ "${WATCH:-1}" = 1 ] && command -v gh >/dev/null 2>&1; then
	log 'Attendo il workflow di release'
	run_id=''
	for _ in $(seq 1 20); do
		run_id=$(gh run list --workflow release.yml --branch "$next" --limit 1 \
			--json databaseId --jq '.[0].databaseId // empty' 2>/dev/null || true)
		[ -n "$run_id" ] && break
		sleep 3
	done
	if [ -z "$run_id" ]; then
		log "Workflow non trovato: controlla con 'gh run list --workflow release.yml'."
	else
		gh run watch "$run_id" --exit-status || die "la release $next è fallita: vedi 'gh run view $run_id --log-failed'."
	fi
fi

log "Release $next pubblicata. Nell'LXC: sudo registro-ore-update"
