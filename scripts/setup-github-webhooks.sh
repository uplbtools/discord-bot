#!/usr/bin/env bash
# Register or update GitHub repo webhooks → uplbtools-discord-bot /webhooks/github/repo
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

EVENTS=(
  issues
  pull_request
  push
  release
  workflow_run
  pull_request_review
  dependabot_alert
  repository_vulnerability_alert
  code_scanning_alert
  secret_scanning_alert
  deployment
  deployment_status
)

payload() {
  jq -n \
    --arg url "$WEBHOOK_URL" \
    --arg secret "$SECRET" \
    --argjson events "$(printf '%s\n' "${EVENTS[@]}" | jq -R . | jq -s .)" \
    '{
      name: "web",
      active: true,
      events: $events,
      config: {
        url: $url,
        content_type: "json",
        insecure_ssl: "0",
        secret: $secret
      }
    }'
}

for repo in "${REPOS[@]}"; do
  full="${ORG}/${repo}"
  hook_id=$(gh api "repos/${full}/hooks" --jq ".[] | select(.config.url==\"${WEBHOOK_URL}\") | .id" 2>/dev/null | head -1 || true)

  if [[ -n "$hook_id" ]]; then
    gh api "repos/${full}/hooks/${hook_id}" --method PATCH --input - <<<"$(payload)" \
      --jq '{id, events, url: .config.url, updated: true}'
    echo "✓ ${full} — webhook updated (id ${hook_id})"
  else
    gh api "repos/${full}/hooks" --method POST --input - <<<"$(payload)" \
      --jq '{id, events, url: .config.url}'
    echo "✓ ${full} — webhook created"
  fi
done
