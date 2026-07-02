#!/usr/bin/env bash
# Register GitHub repo webhooks → uplbtools-discord-bot /webhooks/github/repo
# Requires: gh auth with admin:repo_hook (or repo admin) on uplbtools/*
set -euo pipefail

ORG="${GITHUB_ORG:-uplbtools}"
WEBHOOK_URL="${WEBHOOK_URL:-https://uplbtools-discord-bot-5eb468fac572.herokuapp.com/webhooks/github/repo}"
SECRET="${GITHUB_WEBHOOK_REPO_SECRET:?Set GITHUB_WEBHOOK_REPO_SECRET}"

REPOS=(
  room-tba
  discord-bot
  gradesim
  gradesim-website
  uplbtools.me
)

for repo in "${REPOS[@]}"; do
  full="${ORG}/${repo}"
  existing=$(gh api "repos/${full}/hooks" --jq ".[] | select(.config.url==\"${WEBHOOK_URL}\") | .id" 2>/dev/null || true)
  if [[ -n "$existing" ]]; then
    echo "✓ ${full} — webhook already registered (id ${existing})"
    continue
  fi

  payload=$(jq -n \
    --arg url "$WEBHOOK_URL" \
    --arg secret "$SECRET" \
    '{
      name: "web",
      active: true,
      events: ["issues", "pull_request", "push"],
      config: {
        url: $url,
        content_type: "json",
        insecure_ssl: "0",
        secret: $secret
      }
    }')

  gh api "repos/${full}/hooks" --method POST --input - <<<"$payload" \
    --jq '{id, events, url: .config.url}'

  echo "✓ ${full} — webhook created"
done
