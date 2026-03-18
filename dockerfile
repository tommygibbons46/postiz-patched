FROM ghcr.io/gitroomhq/postiz-app:latest

# Fix Nostr provider: convert hex string to Uint8Array for finalizeEvent
# This fixes https://github.com/gitroomhq/postiz-app/issues/1148
RUN find /app/dist -name "nostr.provider.js" | head -1 | xargs -I{} node -e " \
  const fs = require('fs'); \
  const file = '{}'; \
  let code = fs.readFileSync(file, 'utf8'); \
  const hexToBytes = 'typeof password===\"string\"?Uint8Array.from(password.match(/.{1,2}/g).map(function(b){return parseInt(b,16)})):password'; \
  code = code.replace(/,\s*password\s*\)/g, ', ' + hexToBytes + ')'); \
  fs.writeFileSync(file, code); \
  console.log('Patched nostr.provider.js successfully'); \
"