// Facebook Page stories. Upstream's Facebook provider only posts to the feed
// (or uploads a reel). With settings.post_type === 'story' and an image, this
// posts the first image as a Page photo story instead: upload it unpublished
// to /{page}/photos, then publish it with /{page}/photo_stories. Every other
// Facebook post goes through the upstream code unchanged.
// The script exits non-zero if it finds nothing to patch, so a changed
// upstream fails the build instead of deploying without stories.
const fs = require('fs');
const { execSync } = require('child_process');

const MARKER = 'upload images slides';
const files = execSync(
  "grep -rlF --include='*.js' \"upload images slides\" " + (process.env.PATCH_ROOT || "/app") + " --exclude-dir=node_modules || true"
).toString().trim().split('\n').filter(Boolean);

function storyBranch(page, token, details) {
  const g = 'https://graph.facebook.com/v20.0/';
  return (
    'const __st = ' + details + ' && ' + details + '[0];' +
    "if (__st && __st.settings && __st.settings.post_type === 'story' && __st.media && __st.media.length) {" +
    "const __ph = await (await this.fetch('" + g + "' + " + page + " + '/photos?access_token=' + " + token + ", {" +
    "method: 'POST', headers: { 'Content-Type': 'application/json' }," +
    ' body: JSON.stringify({ url: __st.media[0].path, published: false }) }, ' +
    "'upload story photo')).json();" +
    "const __sr = await (await this.fetch('" + g + "' + " + page + " + '/photo_stories?access_token=' + " + token + ", {" +
    "method: 'POST', headers: { 'Content-Type': 'application/json' }," +
    ' body: JSON.stringify({ photo_id: __ph.id }) }, ' +
    "'publish story')).json();" +
    'return [{ id: __st.id, postId: String((__sr && __sr.post_id) || __ph.id),' +
    " releaseURL: 'https://www.facebook.com/' + " + page + ", status: 'success' }];" +
    '}'
  );
}

let patched = 0;
for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  if (code.includes('/photo_stories')) { patched++; continue; } // already patched
  const idx = code.indexOf(MARKER);
  if (idx === -1) continue;
  // The post() that holds this marker: the nearest one before it.
  const start = code.lastIndexOf('async post(', idx);
  const m = start === -1 ? null : /^async post\(\s*(\w+)\s*,\s*(\w+)\s*,\s*(\w+)\s*\)\s*\{/.exec(code.slice(start));
  if (!m || idx - start > 8000) continue;
  const bodyAt = start + m[0].length;
  code = code.slice(0, bodyAt) + storyBranch(m[1], m[2], m[3]) + code.slice(bodyAt);
  fs.writeFileSync(file, code);
  patched++;
  console.log('Patched Facebook stories: ' + file);
}

if (!patched) {
  console.error('No Facebook post() found to add stories to; refusing to build blind.');
  process.exit(1);
}
