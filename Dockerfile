FROM ghcr.io/gitroomhq/postiz-app:latest

# Fix Nostr provider: convert hex string to Uint8Array for finalizeEvent
# This fixes https://github.com/gitroomhq/postiz-app/issues/1148
RUN node -e " \
  const fs = require('fs'); \
  const files = require('child_process').execSync('find /app -name \"nostr.provider*\" -type f').toString().trim().split('\n'); \
  files.forEach(file => { \
    let code = fs.readFileSync(file, 'utf8'); \
    if (code.includes(', password)') || code.includes(',password)')) { \
      code = code.replace(/,\s*password\s*\)/g, ', typeof password === \"string\" ? Uint8Array.from(password.match(/.{1,2}/g).map(function(b){return parseInt(b,16)})) : password)'); \
      fs.writeFileSync(file, code); \
      console.log('Patched: ' + file); \
    } else { \
      console.log('No match in: ' + file); \
    } \
  }); \
"