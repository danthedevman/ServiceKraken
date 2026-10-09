import { createHash } from 'node:crypto';

/** Convert plain text into Jira's document format without interpreting user HTML. */
function document(text) {
  return {
    type: 'doc',
    version: 1,
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  };
}

/** Correlate ticket creation across retries; recovery appends a comment without closing remote work. */
export async function sendTicket(type, secret, incident, delivery, body, request) {
  const marker = `servicetrident-${createHash('sha256').update(`${incident.workspaceId}:${incident._id}`).digest('hex').slice(0, 32)}`;
  const root = secret.url.replace(/\/$/, '');
  if (type === 'github') {
    const repo = new URL(root).pathname.slice('/repos/'.length);
    const headers = {
      Authorization: `Bearer ${secret.token}`,
      'User-Agent': 'ServiceTrident',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    let number = delivery.externalId;
    if (!number) {
      const found = await request(
        `https://api.github.com/search/issues?q=${encodeURIComponent(`repo:${repo} is:issue in:body ${marker}`)}&per_page=1`,
        'GET',
        undefined,
        headers,
      );
      number = found.items?.[0]?.number;
    }
    if (number) {
      if (!/^\d+$/.test(String(number))) throw new Error('Invalid GitHub issue number.');
      if (delivery.event === 'recovered')
        await request(`${root}/issues/${number}/comments`, 'POST', { body }, headers);
      return { externalId: String(number) };
    }
    if (delivery.event === 'recovered') throw new Error('Waiting for related issue creation.');
    const created = await request(
      `${root}/issues`,
      'POST',
      { title: incident.title.slice(0, 256), body: `${body}\n\nCorrelation: ${marker}` },
      headers,
    );
    if (!Number.isSafeInteger(created.number) || created.number < 1)
      throw new Error('GitHub did not confirm creation.');
    return { externalId: String(created.number) };
  }
  const headers = {
    Authorization: `Basic ${Buffer.from(`${secret.username}:${secret.password}`).toString('base64')}`,
  };
  let key = delivery.externalId;
  if (!key) {
    const found = await request(
      `${root}/rest/api/3/search/jql`,
      'POST',
      {
        jql: `project = "${secret.projectKey}" AND labels = "${marker}"`,
        maxResults: 1,
        fields: ['key'],
      },
      headers,
    );
    key = found.issues?.[0]?.key;
  }
  if (key) {
    if (!/^[A-Z][A-Z0-9_]*-\d+$/.test(key)) throw new Error('Invalid Jira issue key.');
    if (delivery.event === 'recovered')
      await request(
        `${root}/rest/api/3/issue/${key}/comment`,
        'POST',
        { body: document(body) },
        headers,
      );
    return { externalId: key };
  }
  if (delivery.event === 'recovered') throw new Error('Waiting for related issue creation.');
  const created = await request(
    `${root}/rest/api/3/issue`,
    'POST',
    {
      fields: {
        project: { key: secret.projectKey },
        issuetype: { id: secret.issueTypeId },
        summary: incident.title.slice(0, 255),
        description: document(body),
        labels: [marker],
      },
    },
    headers,
  );
  if (!/^[A-Z][A-Z0-9_]*-\d+$/.test(created.key)) throw new Error('Jira did not confirm creation.');
  return { externalId: created.key };
}
