// Skip the paid users/me lookup on every X post.
// Upstream's XProvider.post() and comment() call client.v2.me() only to
// build the release URL (https://twitter.com/<username>/status/<id>).
// X bills each API call, so that lookup is a wasted read per post.
// https://twitter.com/i/status/<id> resolves to the same tweet without it.
const fs = require('fs');
const { execSync } = require('child_process');

const files = execSync("find /app -name 'x.provider.js' -type f -not -path '*/node_modules/*'")
  .toString().trim().split('\n').filter(Boolean);

const re = /client\.v2\.me\(\{\s*['"]user\.fields['"]\s*:\s*['"]username['"]\s*,?\s*\}\)/g;
let total = 0;

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  const hits = (code.match(re) || []).length;
  if (!hits) continue;
  code = code.replace(re, "Promise.resolve({ data: { username: 'i' } })");
  fs.writeFileSync(file, code);
  total += hits;
  console.log('Skipped X user lookup (' + hits + ' calls): ' + file);
}

if (!total) {
  console.error('No X users/me lookup found to patch; refusing to build blind.');
  process.exit(1);
}
