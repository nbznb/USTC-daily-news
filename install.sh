#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
OPENCLAW_DIR="${HOME}/.openclaw"
USER_DIR="${OPENCLAW_DIR}/ustc-daily-news"
LEGACY_USER_DIR="${HOME}/.ustc-dailynews"
APP_DIR="${USER_DIR}/app"
BIN_DIR="${USER_DIR}/bin"
CONFIG_PATH="${USER_DIR}/config.json"
ENV_PATH="${USER_DIR}/.env"
WRAPPER_PATH="${BIN_DIR}/ustc-daily-news"
OPENCLAW_SKILLS_DIR="${OPENCLAW_DIR}/skills"
SKILL_NAME="ustc-daily-news"
INSTALLED_SKILL_DIR="${OPENCLAW_SKILLS_DIR}/${SKILL_NAME}"

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

rm -rf "${APP_DIR}" "${INSTALLED_SKILL_DIR}"
mkdir -p "${USER_DIR}" "${USER_DIR}/prompts" "${APP_DIR}" "${BIN_DIR}" "${OPENCLAW_SKILLS_DIR}"

cp -R "${SCRIPT_DIR}/config" "${APP_DIR}/config"
cp -R "${SCRIPT_DIR}/examples" "${APP_DIR}/examples"
cp -R "${SCRIPT_DIR}/prompts" "${APP_DIR}/prompts"
cp -R "${SCRIPT_DIR}/scripts" "${APP_DIR}/scripts"
cp -R "${SCRIPT_DIR}/skills" "${APP_DIR}/skills"

rm -rf "${APP_DIR}/scripts/node_modules"

echo "Installing dependencies in ${APP_DIR}/scripts ..."
(
  cd "${APP_DIR}/scripts"
  npm install
)

cat > "${WRAPPER_PATH}" <<EOF
#!/usr/bin/env bash

set -euo pipefail

APP_DIR="${APP_DIR}"
SCRIPTS_DIR="\${APP_DIR}/scripts"

usage() {
  cat <<'USAGE'
Usage: ustc-daily-news <command> [args...]

Commands:
  generate-feed [args...]      Refresh local feeds
  validate-sources             Validate source definitions
  prepare-digest               Build the LLM-ready digest payload
  deliver [args...]            Deliver a digest via stdout/Telegram/email
  help                         Show this message
USAGE
}

command="\${1:-help}"
if [ "\$#" -gt 0 ]; then
  shift
fi

case "\${command}" in
  generate-feed)
    exec node "\${SCRIPTS_DIR}/generate-feed.js" "\$@"
    ;;
  validate-sources)
    exec node "\${SCRIPTS_DIR}/generate-feed.js" --validate --report "\${APP_DIR}/source-validation-report.json" "\$@"
    ;;
  prepare-digest)
    exec node "\${SCRIPTS_DIR}/prepare-digest.js" "\$@"
    ;;
  deliver)
    exec node "\${SCRIPTS_DIR}/deliver.js" "\$@"
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    echo "Error: unknown command '\${command}'." >&2
    usage >&2
    exit 1
    ;;
esac
EOF
chmod +x "${WRAPPER_PATH}"

cp -R "${APP_DIR}/skills/${SKILL_NAME}" "${INSTALLED_SKILL_DIR}"

if [ -d "${LEGACY_USER_DIR}/prompts" ] && [ -z "$(find "${USER_DIR}/prompts" -mindepth 1 -print -quit 2>/dev/null)" ]; then
  cp -R "${LEGACY_USER_DIR}/prompts/." "${USER_DIR}/prompts/"
fi

if [ ! -f "${CONFIG_PATH}" ]; then
  if [ -f "${LEGACY_USER_DIR}/config.json" ]; then
    cp "${LEGACY_USER_DIR}/config.json" "${CONFIG_PATH}"
    echo "Migrated existing config to ${CONFIG_PATH}"
  else
    cat > "${CONFIG_PATH}" <<'EOF'
{
  "platform": "openclaw",
  "language": "zh",
  "timezone": "Asia/Shanghai",
  "frequency": "daily",
  "deliveryTime": "08:00",
  "selectedDepartments": ["少年班学院"],
  "delivery": {
    "method": "stdout"
  },
  "onboardingComplete": false
}
EOF
    echo "Created default config at ${CONFIG_PATH}"
  fi
else
  echo "Keeping existing config at ${CONFIG_PATH}"
fi

if [ ! -f "${ENV_PATH}" ]; then
  if [ -f "${LEGACY_USER_DIR}/.env" ]; then
    cp "${LEGACY_USER_DIR}/.env" "${ENV_PATH}"
    echo "Migrated existing env file to ${ENV_PATH}"
  else
    : > "${ENV_PATH}"
    echo "Created empty env file at ${ENV_PATH}"
  fi
fi

"${WRAPPER_PATH}" help >/dev/null
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

echo
echo "OpenClaw install is ready."
echo "Next steps:"
echo "  1. Review ${CONFIG_PATH} and adjust language, schedule, and departments."
echo "  2. Add Telegram or Resend secrets to ${ENV_PATH} if needed."
echo "  3. Run: ${WRAPPER_PATH} prepare-digest"
echo "  4. Check: openclaw skills info ${SKILL_NAME}"
echo
echo "Installed runtime: ${APP_DIR}"
echo "Installed command: ${WRAPPER_PATH}"
echo "Installed OpenClaw skill: ${INSTALLED_SKILL_DIR}"
echo "Each digest run now attempts a fresh local feed refresh before falling back."
