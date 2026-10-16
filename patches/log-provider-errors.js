// Log the real provider error when posting fails.
// Upstream's SocialAbstract.runInConcurrent catches every provider error,
// runs it through handleErrors(), and rethrows a BadBody whose only text is
// "Unknown Error" when no known string matched. The real API response is
// lost, so a failed post shows nothing useful anywhere.
const fs = require('fs');
const { execSync } = require('child_process');

const files = execSync(
  "grep -rlE --include='*.js' 'handleErrors\\(' /app --exclude-dir=node_modules || true"
).toString().trim().split('\n').filter(Boolean);

const re = /catch\s*\((\w+)\)\s*\{(\s*(?:const|let|var)\s+\w+\s*=\s*this\.handleErrors\()/g;
let patched = 0;

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  if (!re.test(code)) continue;
  re.lastIndex = 0;
  code = code.replace(re, (_m, e, rest) =>
    `catch (${e}) {try{console.error('[POSTIZ-PROVIDER-ERROR]', this && this.identifier, ${e} && ${e}.code, ${e} && ${e}.message, JSON.stringify((${e} && (${e}.data || ${e}.errors || ${e}.error)) || {}).slice(0, 4000));}catch(_l){}${rest}`
  );
  fs.writeFileSync(file, code);
  patched++;
  console.log('Patched provider error logging: ' + file);
}

if (!patched) {
  console.error('No runInConcurrent catch block found; refusing to build blind.');
  process.exit(1);
}
