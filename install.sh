#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
OPENCLAW_DIR="${HOME}/.openclaw"
OPENCLAW_SKILLS_DIR="${OPENCLAW_DIR}/skills"
SKILL_NAME="ustc-daily-news"
INSTALLED_SKILL_DIR="${OPENCLAW_SKILLS_DIR}/${SKILL_NAME}"
LEGACY_USER_DIR="${OPENCLAW_DIR}/ustc-daily-news"
CONFIG_PATH="${INSTALLED_SKILL_DIR}/config.json"
ENV_PATH="${INSTALLED_SKILL_DIR}/.env"
TMP_DIR="$(mktemp -d)"
BACKUP_CONFIG_PATH="${TMP_DIR}/config.json"
BACKUP_ENV_PATH="${TMP_DIR}/.env"
HAS_BACKUP_CONFIG=0
HAS_BACKUP_ENV=0

cleanup() {
  rm -rf "${TMP_DIR}"
}

trap cleanup EXIT

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: '$1' is required but was not found in PATH." >&2
    exit 1
  fi
}

require_path() {
  if [ ! -e "$1" ]; then
    echo "Error: required path is missing: $1" >&2
    echo "This checkout is incomplete. Run install.sh from a full repository or a packaged release that contains config/, prompts/, scripts/, and skills/." >&2
    exit 1
  fi
}

require_command node
require_command npm
require_command openclaw

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "${NODE_MAJOR}" -lt 20 ]; then
  echo "Error: Node.js 20+ is required. Current version: $(node -v)" >&2
  exit 1
fi

require_path "${SCRIPT_DIR}/config/default-sources.json"
require_path "${SCRIPT_DIR}/config/config-schema.json"
require_path "${SCRIPT_DIR}/prompts/digest-intro.md"
require_path "${SCRIPT_DIR}/prompts/summarize-announcements.md"
require_path "${SCRIPT_DIR}/prompts/summarize-tech-news.md"
require_path "${SCRIPT_DIR}/prompts/translate.md"
require_path "${SCRIPT_DIR}/scripts/package.json"
require_path "${SCRIPT_DIR}/scripts/generate-feed.js"
require_path "${SCRIPT_DIR}/scripts/prepare-digest.js"
require_path "${SCRIPT_DIR}/scripts/deliver.js"
require_path "${SCRIPT_DIR}/skills/${SKILL_NAME}/SKILL.md"

backup_first_existing_file() {
  local destination="$1"
  shift
  for candidate in "$@"; do
    if [ -f "${candidate}" ]; then
      cp "${candidate}" "${destination}"
      return 0
    fi
  done
  return 1
}

if backup_first_existing_file "${BACKUP_CONFIG_PATH}" \
  "${INSTALLED_SKILL_DIR}/config.json" \
  "${LEGACY_USER_DIR}/config.json"; then
  HAS_BACKUP_CONFIG=1
fi

if backup_first_existing_file "${BACKUP_ENV_PATH}" \
  "${INSTALLED_SKILL_DIR}/.env" \
  "${LEGACY_USER_DIR}/.env"; then
  HAS_BACKUP_ENV=1
fi

rm -rf "${INSTALLED_SKILL_DIR}"
mkdir -p "${OPENCLAW_SKILLS_DIR}"

cp -R "${SCRIPT_DIR}/skills/${SKILL_NAME}" "${INSTALLED_SKILL_DIR}"
cp -R "${SCRIPT_DIR}/config" "${INSTALLED_SKILL_DIR}/config"
cp -R "${SCRIPT_DIR}/examples" "${INSTALLED_SKILL_DIR}/examples"
cp -R "${SCRIPT_DIR}/prompts" "${INSTALLED_SKILL_DIR}/prompts"
cp -R "${SCRIPT_DIR}/scripts" "${INSTALLED_SKILL_DIR}/scripts"

rm -rf "${INSTALLED_SKILL_DIR}/scripts/node_modules"

echo "Installing dependencies in ${INSTALLED_SKILL_DIR}/scripts ..."
(
  cd "${INSTALLED_SKILL_DIR}/scripts"
  npm install
)

if [ "${HAS_BACKUP_CONFIG}" -eq 1 ]; then
  cp "${BACKUP_CONFIG_PATH}" "${CONFIG_PATH}"
  echo "Restored preserved config to ${CONFIG_PATH}"
else
  cat > "${CONFIG_PATH}" <<'EOF'
{
  "platform": "openclaw",
  "language": "zh",
  "timezone": "Asia/Shanghai",
  "frequency": "daily",
  "deliveryTime": "08:00",
  "selectedDepartments": [],
  "allowDuplicatePush": true,
  "delivery": {
    "method": "stdout"
  },
  "onboardingComplete": false
}
EOF
  echo "Created default config at ${CONFIG_PATH}"
fi

if [ "${HAS_BACKUP_ENV}" -eq 1 ]; then
  cp "${BACKUP_ENV_PATH}" "${ENV_PATH}"
  echo "Restored preserved env file to ${ENV_PATH}"
else
  : > "${ENV_PATH}"
  echo "Created empty env file at ${ENV_PATH}"
fi

openclaw skills info "${SKILL_NAME}" >/dev/null

SKILL_ELIGIBLE="$(openclaw skills list --eligible --json | node -e "
const chunks = [];
process.stdin.on('data', chunk => chunks.push(chunk));
process.stdin.on('end', () => {
  const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  const skills = Array.isArray(payload.skills) ? payload.skills : [];
  process.exit(skills.some(skill => skill && skill.name === '${SKILL_NAME}') ? 0 : 1);
});
")"
unset SKILL_ELIGIBLE

if [ -d "${LEGACY_USER_DIR}" ]; then
  rm -rf "${LEGACY_USER_DIR}"
  echo "Removed legacy runtime directory: ${LEGACY_USER_DIR}"
fi

echo
echo "OpenClaw install is ready."
echo "Next steps:"
echo "  1. Review ${CONFIG_PATH} and set selectedDepartments if needed."
echo "  2. Add Telegram or Resend secrets to ${ENV_PATH} if needed."
echo "  3. Run: cd ${INSTALLED_SKILL_DIR}/scripts && node prepare-digest.js"
echo "  4. Check: openclaw skills info ${SKILL_NAME}"
echo
echo "Installed OpenClaw skill: ${INSTALLED_SKILL_DIR}"
echo "Each digest run now attempts a fresh local feed refresh before falling back."
