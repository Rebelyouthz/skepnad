#!/usr/bin/env bash
# Bygger Skepnad och publicerar dist/ på grenen gh-pages → https://rebelyouthz.github.io/skepnad/
# Används istället för GitHub Actions. Kör: npm run deploy
# (GH_TOKEN kan sättas om git saknar inloggning, t.ex. GH_TOKEN=$(gh auth token) i Windows.)
set -euo pipefail
cd "$(dirname "$0")/.."
REMOTE_URL=$(git remote get-url github)
SRC=$(git rev-parse --short HEAD)

npm run build
touch dist/.nojekyll

AUTH=()
if [ -n "${GH_TOKEN:-}" ]; then
  AUTH=(-c credential.helper= -c "credential.helper=!f() { echo username=x-access-token; echo password=\$GH_TOKEN; }; f")
fi

WORK=$(mktemp -d)
git "${AUTH[@]}" clone -q --depth 1 --branch gh-pages --single-branch "$REMOTE_URL" "$WORK/site"
git -C "$WORK/site" rm -rq --ignore-unmatch .
cp -r dist/. "$WORK/site/"
git -C "$WORK/site" add -A
if git -C "$WORK/site" -c user.name="${GIT_NAME:-Timmie}" -c user.email="${GIT_EMAIL:-cryptolinen@gmail.com}" commit -q -m "Publicera Skepnad ($SRC)"; then
  git -C "$WORK/site" "${AUTH[@]}" push -q origin gh-pages
  echo "Publicerat: https://rebelyouthz.github.io/skepnad/ (klart om ungefär en minut)"
else
  echo "Inget nytt att publicera."
fi
