#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
USER_DIR="${HOME}/.ustc-dailynews"
CONFIG_PATH="${USER_DIR}/config.json"
ENV_PATH="${USER_DIR}/.env"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: '$1' is required but was not found in PATH." >&2
    exit 1
  fi
}

require_command node
require_command npm

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "${NODE_MAJOR}" -lt 20 ]; then
  echo "Error: Node.js 20+ is required. Current version: $(node -v)" >&2
  exit 1
fi

mkdir -p "${USER_DIR}" "${USER_DIR}/prompts"

echo "Installing dependencies in ${SCRIPT_DIR}/scripts ..."
(
  cd "${SCRIPT_DIR}/scripts"
  npm install
)

if [ ! -f "${CONFIG_PATH}" ]; then
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
else
  echo "Keeping existing config at ${CONFIG_PATH}"
fi

if [ ! -f "${ENV_PATH}" ]; then
  : > "${ENV_PATH}"
  echo "Created empty env file at ${ENV_PATH}"
fi

echo
echo "OpenClaw install is ready."
echo "Next steps:"
echo "  1. Review ${CONFIG_PATH} and adjust language, schedule, and departments."
echo "  2. Add Telegram or Resend secrets to ${ENV_PATH} if needed."
echo "  3. Run: cd \"${SCRIPT_DIR}/scripts\" && npm run prepare-digest"
echo
echo "Each digest run now attempts a fresh local feed refresh before falling back."
