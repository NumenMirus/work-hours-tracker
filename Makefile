.PHONY: release

# Release: make release [BUMP=patch|minor|major] [VERSION=X.Y.Z] [DRY_RUN=1] [SKIP_CHECKS=1] [YES=1]
# Dettagli e variabili in deploy/release.sh.
BUMP ?= patch

release:
	@deploy/release.sh $(or $(VERSION),$(BUMP))
