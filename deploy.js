const fs = require('fs');
const path = require('path');

const TOKEN = process.argv[2];
const REPO = 'wangxuanhe123/qiqi';
const BRANCH = 'master';
const files = ['index.html', 'sw.js', 'manifest.json'];

const API = 'https://api.github.com/repos/' + REPO + '/contents/';

async function gh(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': 'token ' + TOKEN,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'deploy-script',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  if (!res.ok) {
    throw new Error(method + ' ' + url + ' -> ' + res.status + ' ' + (json && json.message || text));
  }
  return json;
}

(async () => {
  for (const f of files) {
    const p = path.join(__dirname, f);
    const content = fs.readFileSync(p, 'utf8');
    const b64 = Buffer.from(content, 'utf8').toString('base64');

    // Get current sha (file may or may not exist)
    let sha;
    try {
      const cur = await gh('GET', API + f + '?ref=' + BRANCH);
      sha = cur.sha;
    } catch (e) {
      console.log(f + ': no existing sha (new file)');
    }

    const body = {
      message: 'v26: fix 视角锁定 over-suppressing 七七 own parenthetical actions',
      content: b64,
      branch: BRANCH,
    };
    if (sha) body.sha = sha;

    const r = await gh('PUT', API + f, body);
    console.log('✓ ' + f + ' -> ' + r.content.html_url + ' (' + Buffer.from(content, 'utf8').length + ' bytes)');
  }
  console.log('DONE');
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
