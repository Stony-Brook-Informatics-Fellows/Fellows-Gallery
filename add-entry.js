// Turns a gallery submission issue into an entry in gallery.json.
// Runs inside actions/github-script. You don't need to edit this file.

const fs = require('fs');
const path = require('path');

const ALLOWED = ['OWNER', 'MEMBER', 'COLLABORATOR'];
const EMPTY = '_No response_';

const LABELS = ['Prompt title', 'Your name', 'Category', 'Tool used', 'What it does', 'Prompt',
  'Screenshots', 'Link to the output (optional)', 'Confirmation'];

// Splits the form body on the known field headings only, so prompts that
// contain their own "###" headings stay intact.
function parseForm(body) {
  const esc = LABELS.map(l => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const re = new RegExp(`^###\\s+(${esc})\\s*$`, 'gm');
  const marks = [...body.matchAll(re)];
  const fields = {};
  marks.forEach((m, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].index : body.length;
    let value = body.slice(m.index + m[0].length, end).trim();
    if (value === EMPTY) value = '';
    fields[m[1]] = value;
  });
  return fields;
}

function findImages(text) {
  const urls = [];
  const md = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;
  const html = /<img[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = md.exec(text))) urls.push(m[1]);
  while ((m = html.exec(text))) urls.push(m[1]);
  return [...new Set(urls)];
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'entry';
}

const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };

async function download(url, destBase) {
  const attempts = [{}, { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } }];
  for (const opts of attempts) {
    try {
      const res = await fetch(url, { redirect: 'follow', ...opts });
      if (!res.ok) continue;
      const type = (res.headers.get('content-type') || '').split(';')[0];
      const ext = EXT[type];
      if (!ext) continue;
      const file = `${destBase}.${ext}`;
      fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      return file;
    } catch (e) {
      // Try the next approach.
    }
  }
  return null;
}

module.exports = async ({ github, context, core }) => {
  const issue = context.payload.issue;
  const reply = (status, message) => {
    core.setOutput('status', status);
    core.setOutput('message', message);
  };

  if (!ALLOWED.includes(issue.author_association)) {
    reply('rejected',
      'Thanks for your interest. Only members of the fellows organization can add to the gallery, ' +
      'so this submission was not published. Ask an organization owner to invite you, then submit again.');
    return;
  }

  const f = parseForm(issue.body || '');
  const title = f['Prompt title'] || issue.title.replace(/^\[Gallery\]\s*/i, '');
  const imageUrls = findImages(f['Screenshots'] || '');

  if (!imageUrls.length) {
    reply('missing',
      'This submission has no screenshot, so it was not published. Editing this issue does not retry it. ' +
      'Open a new submission and attach at least one image in the **Screenshots** field.');
    return;
  }

  const galleryPath = path.join(process.cwd(), 'gallery.json');
  const gallery = fs.existsSync(galleryPath)
    ? JSON.parse(fs.readFileSync(galleryPath, 'utf8'))
    : { entries: [] };

  const date = issue.created_at.slice(0, 10);
  let id = `${date}-${slugify(title)}`;
  let n = 2;
  while (gallery.entries.some(e => e.id === id)) id = `${date}-${slugify(title)}-${n++}`;

  const dir = path.join('entries', id);
  fs.mkdirSync(dir, { recursive: true });

  const images = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const saved = await download(imageUrls[i], path.join(dir, `screenshot-${i + 1}`));
    images.push(saved ? saved.split(path.sep).join('/') : imageUrls[i]);
  }

  const entry = {
    id,
    title,
    author: f['Your name'] || issue.user.login,
    github: issue.user.login,
    category: f['Category'] || 'Other',
    tool: f['Tool used'] || '',
    description: f['What it does'] || '',
    prompt: f['Prompt'] || '',
    images,
    output_url: /^https?:\/\//.test(f['Link to the output (optional)'] || '') ? f['Link to the output (optional)'] : '',
    date,
    issue: issue.html_url,
  };

  fs.writeFileSync(path.join(dir, 'prompt.md'), `# ${title}\n\nBy ${entry.author}\n\n${entry.prompt}\n`);
  gallery.entries.unshift(entry);
  fs.writeFileSync(galleryPath, JSON.stringify(gallery, null, 2) + '\n');

  core.setOutput('title', title);
  reply('added',
    `Added **${title}** to the gallery. It shows up on the gallery page within a few minutes.\n\n` +
    'To change or remove it, ask an organization owner to edit `gallery.json`.');
};
