FROM ghcr.io/gitroomhq/postiz-app:v2.21.6

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

# Log the real provider error when generating an OAuth URL fails.
# Upstream's integrations controller catches the error and returns
# { err: true }, so the only signal is a "Could not connect to the
# platform" toast with no reason anywhere.
RUN node -e " \
  const fs = require('fs'); \
  const out = require('child_process').execSync('find /app -name \"integrations.controller*\" -type f').toString().trim(); \
  const files = out ? out.split('\n') : []; \
  files.forEach(file => { \
    if (file.endsWith('.map')) { return; } \
    let code = fs.readFileSync(file, 'utf8'); \
    const re = /return(\s*)\{\s*err:\s*true\s*\}\s*;/g; \
    if (re.test(code)) { \
      code = code.replace(re, 'console.error(\x27[POSTIZ-AUTH-URL-ERROR]\x27, err \x26\x26 err.code, err \x26\x26 err.message, JSON.stringify((err \x26\x26 err.data) || {})); return { err: true };'); \
      fs.writeFileSync(file, code); \
      console.log('Patched auth-url logging: ' + file); \
    } else { \
      console.log('No auth-url match in: ' + file); \
    } \
  }); \
"
