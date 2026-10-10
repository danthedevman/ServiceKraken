import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { connectDatabase } from '../../shared/persistence/database.js';
import { createApp } from '../../api/src/app.js';

test(
  'AI keys stay encrypted; features enforce provider, roles, tenants, preferences and bounded drafts',
  { timeout: 30000 },
  async (t) => {
    process.env.DATABASE_SCHEMA =
      process.env.MONGODB_DB = `ai_test_${randomUUID().replaceAll('-', '')}`;
    // Synthetic encryption material and credentials, used only in this disposable test process.
    process.env.INTEGRATION_ENCRYPTION_KEY = '1'.repeat(64);
    const { db, client } = await connectDatabase();
    const calls = [];
    let output = 'A synthetic task summary.',
      fail = false;
    const server = createApp(db, {
      aiFetch: async (url, options) => {
        calls.push({ url, options });
        if (fail)
          return new Response('upstream error containing synthetic-provider-key', { status: 401 });
        return Response.json(
          url.includes('openai')
            ? {
                output: [{ content: [{ type: 'output_text', text: output }] }],
                usage: { input_tokens: 20, output_tokens: 10 },
              }
            : {
                content: [{ type: 'text', text: output }],
                usage: { input_tokens: 20, output_tokens: 10 },
              },
        );
      },
    }).listen(0, '0.0.0.0');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(async () => {
      await new Promise((resolve) => server.close(resolve));
      await db.dropDatabase();
      await client.close();
    });
    const request = async (path, cookie, method = 'GET', body) => {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'ServiceTrident',
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return {
        status: response.status,
        data: await response.json(),
        cookie: response.headers.get('set-cookie')?.split(';')[0],
      };
    };
    const owner = await request('/auth/register', null, 'POST', {
      displayName: 'AI Demo Admin',
      email: 'ai-admin@example.test',
      password: 'synthetic test password 123',
    });
    const workspaceId = new ObjectId(owner.data.user.id);
    async function invite(role) {
      const invitation = await request('/invitations', owner.cookie, 'POST', {
        role,
        email: `ai-${role}@example.test`,
        displayName: `AI Demo ${role}`,
      });
      return request('/auth/invite', null, 'POST', {
        token: invitation.data.inviteUrl.split('/').at(-1),
        password: 'synthetic invited password 123',
      });
    }
    const viewer = await invite('viewer'),
      responder = await invite('responder');
    const taskId = new ObjectId(),
      foreignId = new ObjectId(),
      articleId = new ObjectId();
    await db.collection('tasks').insertMany([
      {
        _id: taskId,
        workspaceId,
        title: 'Demo task',
        description: 'Investigate portal',
        status: 'todo',
      },
      { _id: foreignId, workspaceId: new ObjectId(), title: 'Foreign private record' },
    ]);
    await db.collection('articles').insertMany([
      {
        _id: articleId,
        workspaceId,
        title: 'Portal recovery',
        content: 'Restore portal health.',
        status: 'published',
      },
      {
        _id: new ObjectId(),
        workspaceId,
        title: 'Portal draft secret',
        content: 'Unpublished private draft',
        status: 'draft',
      },
    ]);
    assert.equal(
      (
        await request('/ai/generate', owner.cookie, 'POST', {
          action: 'summary',
          kind: 'tasks',
          id: String(taskId),
        })
      ).status,
      409,
    );
    assert.equal(calls.length, 0);
    let config = (await request('/ai/settings', owner.cookie)).data;
    assert.equal(
      (
        await request('/ai/settings', viewer.cookie, 'PUT', {
          type: 'openai',
          model: 'demo-model',
          apiKey: 'synthetic-provider-key',
          revision: config.revision,
        })
      ).status,
      403,
    );
    const configured = await request('/ai/settings', owner.cookie, 'PUT', {
      type: 'openai',
      model: 'demo-model',
      apiKey: 'synthetic-provider-key',
      revision: config.revision,
    });
    assert.equal(configured.status, 200);
    assert.equal(JSON.stringify(configured.data).includes('synthetic-provider-key'), false);
    const saved = await db.collection('operations').findOne({ _id: workspaceId });
    assert.equal(saved.aiProvider.secret.includes('synthetic-provider-key'), false);
    assert.equal(
      (
        await request('/ai/generate', viewer.cookie, 'POST', {
          action: 'summary',
          kind: 'tasks',
          id: String(foreignId),
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await request('/ai/generate', viewer.cookie, 'POST', {
          action: 'draft',
          prompt: 'Draft a recovery guide',
        })
      ).status,
      403,
    );
    const summary = await request('/ai/generate', viewer.cookie, 'POST', {
      action: 'summary',
      kind: 'tasks',
      id: String(taskId),
    });
    assert.equal(summary.status, 200);
    assert.equal(summary.data.text, output);
    assert.equal(calls.at(-1).url, 'https://api.openai.com/v1/responses');
    assert.equal(JSON.parse(calls.at(-1).options.body).store, false);
    assert.equal(calls.at(-1).options.redirect, 'error');
    await request('/auth/preferences', viewer.cookie, 'PATCH', { aiSummaries: false });
    assert.equal(
      (
        await request('/ai/generate', viewer.cookie, 'POST', {
          action: 'summary',
          kind: 'tasks',
          id: String(taskId),
        })
      ).status,
      403,
    );
    output = 'Restore the portal [1].';
    const answer = await request('/ai/generate', responder.cookie, 'POST', {
      action: 'answer',
      question: 'portal recovery',
    });
    assert.equal(answer.status, 200);
    assert.deepEqual(
      answer.data.sources.map((item) => item.id),
      [String(articleId)],
    );
    assert.equal(calls.at(-1).options.body.includes('Unpublished private draft'), false);
    output = JSON.stringify({
      title: 'Demo runbook',
      summary: 'Recovery',
      content: '',
      steps: [{ title: 'Verify health', instructions: 'Review the portal.' }],
    });
    const draft = await request('/ai/generate', responder.cookie, 'POST', {
      action: 'draft',
      articleType: 'runbook',
      prompt: 'Draft portal recovery steps',
    });
    assert.equal(draft.status, 200);
    assert.equal(draft.data.draft.steps.length, 1);
    assert.equal(await db.collection('articles').countDocuments({ workspaceId }), 2);
    output = '{invalid';
    assert.equal(
      (
        await request('/ai/generate', responder.cookie, 'POST', {
          action: 'draft',
          prompt: 'Draft an article',
        })
      ).status,
      502,
    );
    config = (await request('/ai/settings', owner.cookie)).data;
    assert.equal(
      (
        await request('/ai/settings', owner.cookie, 'PUT', {
          type: 'claude',
          model: 'demo-claude',
          revision: config.revision,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request('/ai/settings', owner.cookie, 'PUT', {
          type: 'claude',
          model: 'demo-claude',
          apiKey: 'synthetic-claude-key',
          revision: config.revision,
        })
      ).status,
      200,
    );
    output = 'Claude demo summary';
    assert.equal(
      (
        await request('/ai/generate', responder.cookie, 'POST', {
          action: 'summary',
          kind: 'tasks',
          id: String(taskId),
        })
      ).status,
      200,
    );
    assert.equal(calls.at(-1).url, 'https://api.anthropic.com/v1/messages');
    fail = true;
    const failure = await request('/ai/test', owner.cookie, 'POST', {});
    assert.equal(failure.status, 502);
    assert.equal(JSON.stringify(failure.data).includes('synthetic-provider-key'), false);
    config = (await request('/ai/settings', owner.cookie)).data;
    assert.equal(
      (await request('/ai/settings', owner.cookie, 'DELETE', { revision: config.revision })).status,
      200,
    );
    assert.equal(
      (
        await request('/ai/generate', responder.cookie, 'POST', {
          action: 'summary',
          kind: 'tasks',
          id: String(taskId),
        })
      ).status,
      409,
    );
  },
);
