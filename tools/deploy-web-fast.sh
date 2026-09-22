#!/usr/bin/env bash
# Publish the built PWA to the Huanayun mirror, https://oracle-fast.lazying.art.
#
# The mirror is served by the shared lazystudio ingress (its Caddyfile holds the
# site block); this script only adds a release under /srv/lazyoracle/releases/<sha>
# and moves the `current` symlink. The sudo password is read in-process by
# remote_admin.py and never appears in argv or in the output.
#
#   tools/deploy-web-fast.sh          # uses the existing dist/ (run npm run build first)
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
SSH_CONFIG=/home/lachlan/.config/lazytunnel/ssh-admin.conf
CREDENTIALS="/home/lachlan/Nutstore Files/Share/lazytunnel/admin-credentials.json"
ADMIN=/home/lachlan/DiskMech/Projects/lazyedit/scripts/studio/remote_admin.py
PYTHON=/home/lachlan/miniconda3/envs/lazyedit/bin/python
HOST=hncloud
SITE=https://oracle-fast.lazying.art

cd "$REPO"
[[ -d dist ]] || { echo "no dist/; run npm run build first" >&2; exit 1; }
RELEASE="$(git rev-parse HEAD | cut -c1-16)"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

echo "== package $RELEASE"
tar --sort=name --mtime=@0 --owner=0 --group=0 --numeric-owner -czf "$STAGE/release.tar.gz" dist

echo "== upload"
scp -q -F "$SSH_CONFIG" "$STAGE/release.tar.gz" "$HOST:/tmp/lazyoracle-$RELEASE.tar.gz"

cat > "$STAGE/install.sh" <<INSTALL
set -e
mkdir -p /srv/lazyoracle/releases/$RELEASE
tar -xzf /tmp/lazyoracle-$RELEASE.tar.gz -C /srv/lazyoracle/releases/$RELEASE
chown -R root:root /srv/lazyoracle/releases/$RELEASE
chmod -R a+rX /srv/lazyoracle/releases/$RELEASE
if [ -d /srv/lazyoracle/current/dist/downloads ]; then cp -a /srv/lazyoracle/current/dist/downloads /srv/lazyoracle/releases/$RELEASE/dist/ 2>/dev/null || true; fi
readlink -f /srv/lazyoracle/current > /srv/lazyoracle/releases/$RELEASE/.previous 2>/dev/null || true
ln -sfn /srv/lazyoracle/releases/$RELEASE /srv/lazyoracle/current.tmp
mv -Tf /srv/lazyoracle/current.tmp /srv/lazyoracle/current
rm -f /tmp/lazyoracle-$RELEASE.tar.gz
echo "current -> \$(readlink -f /srv/lazyoracle/current)"
INSTALL

echo "== install"
"$PYTHON" "$ADMIN" "$STAGE/install.sh" --credentials "$CREDENTIALS" --ssh-config "$SSH_CONFIG" --host "$HOST"

echo "== smoke test"
curl -fsS -o /dev/null -w "mirror %{http_code}\n" "$SITE/"
MAIN_ASSET="$(grep -o 'assets/index-[^"]*\.js' dist/index.html | head -1)"
curl -fsS "$SITE/" | grep -q "$MAIN_ASSET" && echo "live index references $MAIN_ASSET"
