import { validateWork } from '../shared/domain/work.js';
import { uiPreferences } from '../shared/domain/ui-preferences.js';
import { validateRichContent } from '../shared/files/rich-content.js';
/** Capture the real UI with fully synthetic responses; no API request reaches a backend. */
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { fieldChoices, workBuiltinFields } from '../shared/forms/form-options.js';
import { validateFields, resolveChoices, BUILTIN_FIELDS } from '../shared/forms/schema.js';
import { rankBetween, taskRank } from '../shared/domain/task-board.js';
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright'
);
const base = process.env.HELP_CAPTURE_URL || 'http://127.0.0.1:5173';
const output = resolve(process.env.HELP_CAPTURE_OUTPUT || 'app/public/help');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 960 },
  colorScheme: 'light',
  serviceWorkers: 'block',
});
const page = await context.newPage();
page.setDefaultTimeout(15000);
const faults = [];
page.on('pageerror', (error) => faults.push(error.message));
const user = {
  id: 'demo-user',
  email: 'alex@example.test',
  displayName: 'Alex Demo',
  role: 'admin',
  uiPreferences: { leftCollapsed: false, filtersOpen: false },
};
const services = [
  {
    id: '111111111111111111111111',
    name: 'Demo Customer Portal',
    status: 'up',
    health: 'Operational',
    description: 'Example customer self-service',
    monitors: 2,
    owners: 'Demo Operations',
    contact: 'Alex Demo',
    dependencies: 'Demo Payments API',
    collections: 'Demo Production',
  },
  {
    id: '222222222222222222222222',
    name: 'Demo Payments API',
    status: 'down',
    health: 'Down',
    description: 'Example payment processing',
    monitors: 1,
    owners: 'Demo Platform',
    contact: 'Sam Demo',
    dependencies: 'None',
    collections: 'Demo Production',
  },
];
const monitors = [
  {
    id: '333333333333333333333333',
    name: 'Demo Portal Availability',
    status: 'up',
    service: services[0].name,
    url: 'https://portal.example.test/health',
    intervalMinutes: 5,
    method: 'HEAD',
    lastCheck: { durationMs: 142, checkedAt: '2026-10-09T12:00:00Z' },
  },
  {
    id: '444444444444444444444444',
    name: 'Demo Payments Health',
    status: 'down',
    service: services[1].name,
    url: 'https://payments.example.test/health',
    intervalMinutes: 1,
    method: 'GET',
    lastCheck: { durationMs: 850, checkedAt: '2026-10-09T12:00:00Z' },
  },
];
let tasks = [
  ['Document portal recovery', 'todo', 'medium'],
  ['Review payment timeouts', 'in_progress', 'high'],
  ['Await provider response', 'blocked', 'high'],
  ['Verify portal recovery', 'done', 'low'],
  ['Previous demo follow-up', 'archived', 'low'],
  ['Confirm rollback checklist', 'todo', 'medium'],
].map(([title, status, priority], index) => ({
  id: (index + 5).toString(16).repeat(24),
  title,
  status,
  priority,
  revision: 0,
  serviceId: services[index % 2].id,
  serviceName: services[index % 2].name,
  assigneeId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  assigneeName: index % 2 ? 'Sam Demo' : 'Alex Demo',
  assignmentGroupId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
  assignmentGroupName: 'Demo Operations',
  description: 'Example follow-up used only in documentation.',
  updatedAt: '2026-10-09T12:00:00Z',
  dueDate: '2026-10-12',
}));
let failMove = false;
let aiProvider = null;
let aiRevision = 0;
let statusBackground = '#e8f2ed';
const mutations = [];
let builderFields = workBuiltinFields('tasks');
let builderRevision = 0;
const demoArticles = [];
const demoIncident = {
  id: 'abababababababababababab',
  title: 'Demo recovered portal incident',
  description: 'Synthetic incident for reopening confirmation.',
  status: 'resolved',
  statusOption: 'resolved',
  severity: 'low',
  severityOption: 'low',
  serviceId: services[0].id,
  serviceName: services[0].name,
  revision: 1,
  custom: {},
  fields: [],
  timeline: [],
};
let incidentWrites = 0;
const demoBases = [
  {
    id: 'cccccccccccccccccccccccc',
    title: 'Demo Operations Runbooks',
    description: 'Example recovery procedures and operating guides.',
  },
];
let laneOrder = [],
  laneRevision = 0;
let authWait = null;
let authStarted;
await context.route('**/api/**', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname.slice(4);
  let data = {};
  if (path === '/incident-fields') data = { fields: BUILTIN_FIELDS, revision: 0 };
  else if (path === '/incidents')
    data = { incidents: [demoIncident], total: 1, page: 1, pageSize: 50 };
  else if (path === `/incidents/${demoIncident.id}`) {
    if (request.method() === 'PATCH') {
      incidentWrites++;
      demoIncident.status = request.postDataJSON().statusOption;
      demoIncident.statusOption = demoIncident.status;
      demoIncident.revision++;
    }
    data = { incident: demoIncident, knowledge: [], comments: [] };
  } else if (path === '/ai/settings') {
    if (request.method() === 'PUT') {
      const body = request.postDataJSON();
      aiProvider = { type: body.type, model: body.model, configured: true };
      aiRevision++;
    }
    data = { provider: aiProvider, revision: aiRevision };
  } else if (path === '/ai/generate') {
    const body = request.postDataJSON();
    data =
      body.action === 'draft'
        ? {
            draft: {
              title: 'Demo portal recovery',
              summary: 'Synthetic recovery guide.',
              content: 'Review service health and confirm recovery before closing the incident.',
              steps: [],
            },
          }
        : {
            text: 'Demo guidance: review portal health, verify successful checks, and document recovery [1].',
            sources:
              body.action === 'answer'
                ? [
                    {
                      id: 'eeeeeeeeeeeeeeeeeeeeeeee',
                      title: 'Demo portal recovery guide',
                      number: 1,
                    },
                  ]
                : [],
          };
  } else if (path === '/ai/test') data = { ok: true };
  else if (path === '/knowledge' && request.method() === 'POST') {
    const body = request.postDataJSON();
    const chosen = resolveChoices(body, workBuiltinFields('knowledge'), 'knowledge');
    const rich = validateRichContent(body.contentDocument, {
      required: chosen.articleType !== 'runbook',
    });
    const input = validateWork({ ...chosen, content: rich.text }, 'knowledge');
    const item = {
      ...input,
      id: 'eeeeeeeeeeeeeeeeeeeeeeee',
      contentDocument: rich.document,
      revision: 1,
      updatedAt: '2026-10-10T17:05:06Z',
      knowledgeBaseTitle: demoBases.find((base) => base.id === input.knowledgeBaseId)?.title,
    };
    demoArticles.push(item);
    data = { item };
  } else if (path.startsWith('/knowledge/') && path !== '/knowledge/fields')
    data = { item: demoArticles.find((article) => article.id === path.split('/').pop()) };
  else if (request.method() === 'PATCH' && path.startsWith('/tasks/')) {
    const body = request.postDataJSON();
    mutations.push(body);
    const item = tasks.find((task) => task.id === path.split('/').pop());
    if (failMove)
      return route.fulfill({
        status: 409,
        json: { error: 'This record changed. Reload it before saving again.' },
      });
    assert.equal(body.revision, item.revision);
    if (body.statusOption) {
      item.statusOption = body.statusOption;
      item.status = fieldChoices(
        'tasks',
        builderFields.find((field) => field.id === 'status'),
      ).find((choice) => choice.value === body.statusOption).base;
    }
    if (body.boardPosition) {
      const target = tasks.find((task) => task.id === body.boardPosition.targetId);
      const others = tasks
        .filter(
          (task) =>
            (task.statusOption ?? task.status) === (item.statusOption ?? item.status) &&
            task.id !== item.id,
        )
        .sort((a, b) => taskRank(a).localeCompare(taskRank(b)));
      const index = others.findIndex((task) => task.id === target.id);
      item.boardRank =
        body.boardPosition.side === 'before'
          ? rankBetween(index ? taskRank(others[index - 1]) : null, taskRank(target))
          : rankBetween(taskRank(target), others[index + 1] ? taskRank(others[index + 1]) : null);
    }
    item.revision += 1;
    data = { item };
  } else if (path === '/knowledge-bases') {
    if (request.method() === 'POST') {
      const body = request.postDataJSON();
      demoBases.push({ id: 'dddddddddddddddddddddddd', ...body });
      data = { item: demoBases.at(-1) };
    } else {
      const matches = demoBases.filter((item) =>
        `${item.title} ${item.description}`
          .toLowerCase()
          .includes((url.searchParams.get('search') || '').toLowerCase()),
      );
      data = { items: matches, total: matches.length, page: 1, pageSize: 25 };
    }
  } else if (path.startsWith('/knowledge-bases/'))
    data = {
      item: {
        ...demoBases.find((item) => item.id === path.split('/').pop()),
        articleCount: demoArticles.filter(
          (article) => article.knowledgeBaseId === path.split('/').pop(),
        ).length,
      },
    };
  else if (path === '/knowledge') {
    const items = demoArticles.filter(
      (article) =>
        !url.searchParams.get('knowledgeBaseId') ||
        article.knowledgeBaseId === url.searchParams.get('knowledgeBaseId'),
    );
    data = { items, total: items.length, page: 1, pageSize: 10 };
  } else if (path === '/knowledge-fields')
    data = { fields: workBuiltinFields('knowledge'), revision: 0 };
  else if (path === '/on-call') data = { shifts: [], revision: 0 };
  else if (path === '/coverage') data = { items: [], total: 0, page: 1, pageSize: 10 };
  else if (path === '/references/services')
    data = {
      options: services.map((item) => ({ id: item.id, label: item.name })),
      selected: [],
      hasMore: false,
    };
  else if (path === '/references/knowledgeBases')
    data = {
      options: demoBases.map((item) => ({ id: item.id, label: item.title })),
      selected: demoBases.map((item) => ({ id: item.id, label: item.title })),
      hasMore: false,
    };
  else if (path === '/task-board-settings') {
    if (request.method() === 'PUT') {
      const body = request.postDataJSON();
      assert.equal(user.role, 'admin');
      assert.equal(body.revision, laneRevision);
      laneOrder = body.order;
      laneRevision++;
    }
    data = { order: laneOrder, revision: laneRevision };
  } else if (path === '/auth/me') {
    authStarted?.();
    if (authWait) await authWait;
    data = { user };
  } else if (path === '/task-fields' && request.method() === 'PUT') {
    const body = request.postDataJSON();
    builderFields = validateFields(body.fields, builderFields, workBuiltinFields('tasks'), 'tasks');
    builderRevision++;
    data = { ok: true };
  } else if (path === '/task-fields') data = { fields: builderFields, revision: builderRevision };
  else if (path === '/services') data = { services };
  else if (path === '/collections') data = { collections: [] };
  else if (path === '/members')
    data = { members: [{ ...user, groupNames: [], revision: 0, timeZone: 'America/New_York' }] };
  else if (path === '/integrations') data = { integrations: [], revision: 0 };
  else if (path === '/response-dashboard')
    data = {
      overview: {
        knowledgeBases: 2,
        articleStatus: { published: 4, draft: 1 },
        services: 2,
        collections: 1,
        groups: 2,
        activeShifts: 1,
        scheduledShifts: 3,
        users: 4,
        enabledIntegrations: 1,
      },
      severity: { critical: 1, high: 2 },
      taskStatus: { todo: 3, blocked: 1 },
      incidentStatus: { open: 3 },
      taskPriority: { high: 2 },
      unassigned: 1,
      overdue: 2,
      services: [],
      incidents: [],
      tasks: [],
      generatedAt: '2026-10-10T17:05:06Z',
    };
  else if (path === '/status')
    data = {
      services,
      monitors,
      generatedAt: '2026-10-10T17:05:06Z',
      backgroundColor: statusBackground,
    };
  else if (path === '/status-settings') {
    if (request.method() === 'PATCH') statusBackground = request.postDataJSON().backgroundColor;
    data = {
      visibility: 'private',
      backgroundColor: statusBackground,
      revision: 0,
      serviceMessages: [],
      subscriptionButtonVisible: false,
    };
  } else if (path === '/groups') data = { groups: [] };
  else if (path === '/monitors') data = { monitors };
  else if (path.startsWith('/tables/')) {
    const rows = path.endsWith('services') ? services : path.endsWith('monitors') ? monitors : [];
    data = { rows, total: rows.length };
  } else if (path === '/tasks') {
    const rows = tasks
      .filter(
        (task) =>
          (!url.searchParams.get('status') || task.status === url.searchParams.get('status')) &&
          (!url.searchParams.get('statusOption') ||
            (task.statusOption ?? task.status) === url.searchParams.get('statusOption')) &&
          task.title.toLowerCase().includes((url.searchParams.get('search') || '').toLowerCase()),
      )
      .sort((a, b) => taskRank(a).localeCompare(taskRank(b)));
    const start =
      (Number(url.searchParams.get('page') || 1) - 1) *
      Number(url.searchParams.get('pageSize') || 10);
    data = {
      items: rows.slice(start, start + Number(url.searchParams.get('pageSize') || 10)),
      total: rows.length,
      page: Number(url.searchParams.get('page') || 1),
      pageSize: Number(url.searchParams.get('pageSize') || 10),
    };
  } else if (path.startsWith('/references/')) data = { items: [], hasMore: false };
  else if (path === '/auth/preferences') {
    user.uiPreferences = uiPreferences({ ...user.uiPreferences, ...request.postDataJSON() });
    data = { preferences: user.uiPreferences };
  } else if (path.startsWith('/tasks/'))
    data = { item: tasks.find((task) => task.id === path.split('/').pop()) };
  else if (path.startsWith('/attachments/')) data = { attachments: [] };
  else return route.fulfill({ status: 404, json: { error: `No demo fixture for ${path}` } });
  return route.fulfill({ json: data });
});
// Block external requests as well as isolating all application API traffic.
await context.route(
  (url) => url.origin !== new URL(base).origin,
  (route) => route.abort(),
);
try {
  await page.goto(`${base}/services`);
  await page.getByRole('link', { name: services[0].name, exact: true }).waitFor();
  await page.screenshot({ path: `${output}/services.png` });
  await page.goto(`${base}/monitors`);
  await page.getByRole('link', { name: monitors[0].name, exact: true }).waitFor();
  await page.screenshot({ path: `${output}/monitoring.png` });
  await page.goto(`${base}/services/new`);
  await page.locator('input[name="name"]').fill('Demo Customer Portal');
  await page
    .locator('textarea[name="description"]')
    .fill('Example service used only in documentation.');
  await page.locator('input[name="name"]').blur();
  await page.screenshot({ path: `${output}/getting-started.png` });
  await page.goto(`${base}/tasks`);
  await page.getByRole('link', { name: 'Document portal recovery', exact: true }).waitFor();
  assert.equal(await page.getByText('Previous demo follow-up', { exact: true }).count(), 0);
  await page.screenshot({ path: `${output}/tasks-board.png` });
  await page
    .getByRole('button', { name: 'Move Confirm rollback checklist up in To do', exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelector('.task-lane-cards .task-card a')?.textContent ===
      'Confirm rollback checklist',
  );
  await page.reload();
  await page.getByRole('link', { name: 'Confirm rollback checklist', exact: true }).waitFor();
  assert.equal(
    await page.locator('.task-lane-cards .task-card a').first().textContent(),
    'Confirm rollback checklist',
  );
  const firstCard = page
    .getByRole('link', { name: 'Confirm rollback checklist', exact: true })
    .locator('..');
  const secondCard = page
    .getByRole('link', { name: 'Document portal recovery', exact: true })
    .locator('..');
  await firstCard.dragTo(secondCard, { targetPosition: { x: 30, y: 220 } });
  await page.waitForFunction(
    () =>
      document.querySelector('.task-lane-cards .task-card a')?.textContent ===
      'Document portal recovery',
  );
  await page
    .getByRole('link', { name: 'Document portal recovery', exact: true })
    .locator('..')
    .dragTo(page.getByRole('region', { name: 'In progress tasks' }));
  await page
    .getByRole('region', { name: 'In progress tasks' })
    .getByRole('link', { name: 'Document portal recovery', exact: true })
    .waitFor();
  assert.equal(mutations.at(-1).statusOption, 'in_progress');
  // Select is the keyboard/touch alternative to drag-and-drop.
  await page
    .getByRole('combobox', { name: 'Move Document portal recovery to', exact: true })
    .focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () =>
      document
        .querySelector('[aria-label="Move Document portal recovery to"]')
        ?.getAttribute('aria-expanded') === 'true',
  );
  await page.keyboard.press('End');
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll('[role="option"]')).some(
      (option) =>
        option.textContent.trim() === 'Done' && option.getAttribute('data-active') === 'true',
    ),
  );
  await page.keyboard.press('Enter');
  await page
    .getByRole('region', { name: 'Done tasks' })
    .getByRole('link', { name: 'Document portal recovery', exact: true })
    .waitFor();
  failMove = true;
  await page
    .getByRole('combobox', { name: 'Move Document portal recovery to', exact: true })
    .click();
  await page.getByRole('option', { name: 'Blocked', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'This record changed.' }).first().waitFor();
  assert.equal(tasks[0].status, 'done');
  await page.getByRole('link', { name: 'Archived Tasks', exact: true }).click();
  await page.getByRole('link', { name: 'Previous demo follow-up', exact: true }).waitFor();
  assert.equal(
    await page.getByRole('link', { name: 'Document portal recovery', exact: true }).count(),
    0,
  );
  user.role = 'viewer';
  await page.goto(`${base}/tasks`);
  await page.getByRole('link', { name: 'Document portal recovery', exact: true }).waitFor();
  assert.equal(await page.locator('[draggable="true"]').count(), 0);
  assert.equal(await page.getByRole('combobox', { name: /^Move .* to$/ }).count(), 0);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.locator('.task-board').evaluate((element) => getComputedStyle(element).overflowX),
    'auto',
  );
  assert.ok(
    await page
      .locator('.task-board')
      .evaluate((element) => element.scrollWidth > element.clientWidth),
  );
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(`${base}/tasks/${tasks[0].id}`);
  const serviceLink = page.getByRole('link', {
    name: 'Demo Customer Portal (opens in a new tab)',
    exact: true,
  });
  await serviceLink.waitFor();
  assert.equal(await serviceLink.getAttribute('href'), `/services/${services[0].id}`);
  assert.equal(await serviceLink.getAttribute('rel'), 'noopener noreferrer');
  assert.equal(
    await page
      .getByRole('link', { name: 'Alex Demo (opens in a new tab)', exact: true })
      .getAttribute('href'),
    '/workspace/aaaaaaaaaaaaaaaaaaaaaaaa',
  );
  assert.equal(
    await page
      .getByRole('link', { name: 'Demo Operations (opens in a new tab)', exact: true })
      .getAttribute('href'),
    '/groups/bbbbbbbbbbbbbbbbbbbbbbbb',
  );
  await page.screenshot({ path: `${output}/record-references.png` });
  await page.goto(`${base}/help?topic=incidents`);
  await page.getByRole('img', { name: /^Demo Tasks Kanban/ }).waitFor();
  assert.equal(
    await page
      .getByRole('img', { name: /^Demo Tasks Kanban/ })
      .evaluate((image) => image.complete && image.naturalWidth > 0),
    true,
  );
  user.role = 'admin';
  let releaseAuth;
  authWait = new Promise((resolve) => {
    releaseAuth = resolve;
  });
  const started = new Promise((resolve) => {
    authStarted = resolve;
  });
  await page.goto(`${base}/tasks/fields`);
  await started;
  assert.equal(
    await page.getByText('Workspace admin access is required.', { exact: true }).count(),
    0,
  );
  releaseAuth();
  authWait = null;
  authStarted = null;
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('button', { name: /^Status \*/ }).click();
  await page.getByLabel('Label', { exact: true }).fill('Demo Workflow');
  await page
    .getByLabel('Help Text', { exact: true })
    .fill('Choose the current stage of this demo task.');
  await page.getByLabel('Quick add options (one per line)', { exact: true }).fill('Demo Review');
  await page.getByRole('button', { name: 'Add options', exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByText('Form saved.', { exact: true }).waitFor();
  assert.equal(builderFields.find((field) => field.id === 'status').label, 'Demo Workflow');
  assert.equal(
    builderFields.find((field) => field.id === 'status').helpText,
    'Choose the current stage of this demo task.',
  );
  assert.ok(
    builderFields
      .find((field) => field.id === 'status')
      .choices.some((choice) => choice.label === 'Demo Review'),
  );
  await page.evaluate(() => {
    const rail = document.querySelector('.record-sidebar-content');
    if (rail) rail.scrollTop = 0;
  });
  await page.screenshot({ path: `${output}/configuration.png` });
  await page.goto(`${base}/tasks`);
  await page.getByRole('region', { name: 'Demo Review task cards', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Move Demo Review lane left', exact: true }).click();
  await page.waitForFunction(
    () => document.querySelectorAll('.task-lane h2')[3]?.textContent === 'Demo Review',
  );
  user.role = 'viewer';
  await page.reload();
  await page.getByRole('region', { name: 'Demo Review task cards', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: /^Move .* lane (left|right)$/ }).count(), 0);
  assert.equal(await page.locator('.task-lane h2').nth(3).textContent(), 'Demo Review');
  user.role = 'admin';
  await page.reload();
  await page.getByRole('button', { name: 'Move Demo Review lane left', exact: true }).waitFor();
  await page.screenshot({ path: `${output}/tasks-board.png` });

  assert.deepEqual(faults, []);

  console.log('Checking continuous card loading');
  for (let index = 0; index < 30; index++)
    tasks.push({
      ...tasks[1],
      id: `99999999999999999999${String(index).padStart(4, '0')}`,
      title: `Demo continuous task ${index}`,
      status: 'todo',
      statusOption: 'todo',
      boardRank: undefined,
    });
  await page.reload();
  const continuous = page.getByRole('region', { name: 'To do task cards', exact: true });
  await continuous.locator('.task-card').first().waitFor();
  await page.locator('.task-board-page').evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await page.getByRole('link', { name: 'Demo continuous task 29', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: /^(Next|Previous).*tasks$/ }).count(), 0);
  tasks.splice(tasks.length - 30, 30);
  console.log('Checking knowledge bases');
  await page.goto(`${base}/knowledge`);
  await page.getByRole('link', { name: /^Demo Operations Runbooks/ }).waitFor();
  assert.equal(await page.getByRole('table').count(), 0);
  await page.getByLabel('Search Knowledge Bases', { exact: true }).fill('missing');
  await page.getByText('No knowledge bases match your search.', { exact: true }).waitFor();
  await page.getByLabel('Search Knowledge Bases', { exact: true }).fill('recovery');
  await page.getByRole('link', { name: /^Demo Operations Runbooks/ }).waitFor();
  await page.getByLabel('Search Knowledge Bases', { exact: true }).fill('');
  await page.getByRole('link', { name: /^Demo Operations Runbooks/ }).waitFor();
  await page.screenshot({ path: `${output}/knowledge-bases.png` });
  await page.getByRole('link', { name: 'Create', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Demo Recovery Guides');
  await page
    .getByLabel('Description', { exact: true })
    .fill('Synthetic recovery procedures for documentation.');
  await page.getByRole('button', { name: 'Create Knowledge Base', exact: true }).click();
  await page.getByRole('heading', { name: 'Demo Recovery Guides', exact: true }).waitFor();
  await page.locator('#main').getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByRole('combobox', { name: /^Knowledge Base/ }).waitFor();
  await page.getByLabel('Title *', { exact: true }).fill('Demo portal recovery guide');
  const createAction = page
    .locator('.record-sticky-header')
    .getByRole('button', { name: 'Create Article', exact: true });
  await createAction.waitFor();
  assert.ok(
    await createAction.getAttribute('form'),
    'Header submit action retains its form association',
  );
  await page.locator('.record-scroll-area').evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  assert.ok(
    (await createAction.boundingBox()).y < 72,
    'Create action remains visible while scrolling',
  );
  await page.locator('.record-scroll-area').evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.screenshot({ path: `${output}/knowledge-article.png` });
  const type = page.getByRole('combobox', { name: 'Type *', exact: true });
  await type.click();
  await page.getByRole('option', { name: 'Runbook', exact: true }).click();
  await page.getByRole('button', { name: 'Add Step', exact: true }).click();
  await page.getByLabel('Step Title', { exact: true }).first().fill('Review service health');
  await page
    .getByLabel('Instructions', { exact: true })
    .first()
    .fill(
      'Open the service status page and confirm the affected service. Record the observed health before proceeding.',
    );
  await page.getByRole('button', { name: 'Add Step', exact: true }).click();
  await page.getByLabel('Step Title', { exact: true }).nth(1).fill('Verify recovery');
  await page
    .getByLabel('Instructions', { exact: true })
    .nth(1)
    .fill(
      'Confirm that recent checks are successful, then document the recovery and any follow-up tasks.',
    );
  await page.getByRole('button', { name: 'Create Article', exact: true }).click();
  await page.getByRole('heading', { name: 'Step-by-Step Process', exact: true }).waitFor();
  await page.getByText(/Loading article/).waitFor({ state: 'hidden' });
  await page.screenshot({ path: `${output}/knowledge-runbook.png` });
  await page.goto(`${base}/knowledge/bases/dddddddddddddddddddddddd`);
  await page.getByRole('button', { name: 'Record actions', exact: true }).click();
  await page.getByRole('button', { name: 'Delete Knowledge Base', exact: true }).click();
  const deletion = page.getByRole('dialog', { name: 'Delete Knowledge Base', exact: true });
  assert.equal(
    await deletion
      .getByRole('button', { name: 'Cancel', exact: true })
      .evaluate((element) => element === document.activeElement),
    true,
  );
  const contentAction = deletion.getByRole('combobox', { name: 'Content Action', exact: true });
  await contentAction.click();
  await page
    .getByRole('option', { name: 'Delete articles with this knowledge base', exact: true })
    .click();
  await deletion
    .getByText('All articles and their attachments will be permanently deleted.', { exact: false })
    .waitFor();
  await page.screenshot({ path: `${output}/knowledge-base-delete.png` });
  await deletion.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.goto(`${base}/incidents/${demoIncident.id}`);
  await page.getByRole('button', { name: 'Reopen', exact: true }).click();
  const reopen = page.getByRole('dialog', { name: 'Reopen Incident', exact: true });
  assert.equal(
    await reopen
      .getByRole('button', { name: 'Cancel', exact: true })
      .evaluate((element) => element === document.activeElement),
    true,
  );
  assert.equal(incidentWrites, 0);
  await reopen.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal(incidentWrites, 0);
  await page.getByRole('button', { name: 'Reopen', exact: true }).click();
  await reopen.getByRole('button', { name: 'Reopen', exact: true }).click();
  await page.getByRole('button', { name: 'Resolve', exact: true }).waitFor();
  assert.equal(incidentWrites, 1);

  await page.goto(`${base}/integrations/ai`);
  const providerHeader = await page.evaluate(() => {
    const main = document.querySelector('#main').getBoundingClientRect();
    const header = document.querySelector('.record-sticky-header').getBoundingClientRect();
    return {
      top: header.top,
      left: Math.abs(main.left - header.left),
      right: Math.abs(main.right - header.right),
    };
  });
  assert.ok(
    providerHeader.top === 0 && providerHeader.left < 1 && providerHeader.right < 1,
    'Provider header fills the content width without outer padding',
  );
  await page.getByLabel('Model', { exact: true }).fill('demo-model');
  await page.getByLabel('API Key', { exact: true }).fill('synthetic-browser-test-key');
  await page.getByRole('button', { name: 'Save Provider', exact: true }).click();
  await page.getByText('A key is saved.', { exact: false }).waitFor();
  assert.equal(await page.getByLabel('API Key', { exact: true }).inputValue(), '');
  await page.screenshot({ path: `${output}/ai-provider.png` });
  await page.goto(`${base}/profile`);
  await page.getByRole('radio', { name: 'Forest', exact: true }).check();
  await page.waitForFunction(() => document.documentElement.dataset.colorScheme === 'forest');
  await page.getByRole('heading', { name: 'Theme', exact: true }).evaluate((element) => {
    const root = element.closest('.record-scroll-area');
    if (root) {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
      root.scrollTop += element.getBoundingClientRect().top - root.getBoundingClientRect().top - 16;
    }
  });
  await page.screenshot({ path: `${output}/profile-themes.png` });
  const clock = page.getByRole('combobox', { name: 'Time Format', exact: true });
  await clock.click();
  await page.getByRole('option', { name: '24-Hour', exact: true }).click();
  const date = page.getByRole('combobox', { name: 'Date Format', exact: true });
  await date.click();
  await page.getByRole('option', { name: 'YYYY-MM-DD', exact: true }).click();
  await page
    .getByRole('heading', { name: 'Date and Time Format', exact: true })
    .evaluate((element) => {
      const root = element.closest('.record-scroll-area');
      if (root) {
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
        root.scrollTop +=
          element.getBoundingClientRect().top - root.getBoundingClientRect().top - 16;
      }
    });
  await page.screenshot({ path: `${output}/profile-date-ai.png` });
  await page.getByRole('switch', { name: 'Task and Incident Summaries', exact: true }).uncheck();
  await page.goto(`${base}/tasks/${tasks[0].id}`);
  assert.equal(await page.getByRole('region', { name: 'AI Summary', exact: true }).count(), 0);
  await page.goto(`${base}/profile`);
  await page.getByRole('switch', { name: 'Task and Incident Summaries', exact: true }).check();
  await page.goto(`${base}/tasks/${tasks[0].id}`);
  await page.getByRole('button', { name: 'Summarize', exact: true }).click();
  await page.getByText('Demo guidance:', { exact: false }).waitFor();
  const alignment = await page.evaluate(() => ({
    header: document.querySelector('.record-sticky-header').getBoundingClientRect().height,
    rail: document.querySelector('.record-sidebar-header').getBoundingClientRect().height,
    idInHeader: !!document.querySelector('.record-sticky-header [aria-label="Record number"]'),
  }));
  assert.ok(Math.abs(alignment.header - alignment.rail) < 1);
  assert.equal(alignment.idInHeader, false);
  await page.goto(`${base}/knowledge/new?knowledgeBaseId=dddddddddddddddddddddddd`);
  await page
    .getByLabel('Describe the article or process', { exact: true })
    .fill('Write a demo portal recovery guide.');
  await page.getByRole('button', { name: 'Generate Draft', exact: true }).click();
  await page.getByRole('button', { name: 'Use Draft in Form', exact: true }).click();
  const applyDraft = page.getByRole('dialog', { name: 'Use AI Draft', exact: true });
  assert.equal(
    await applyDraft
      .getByRole('button', { name: 'Cancel', exact: true })
      .evaluate((element) => element === document.activeElement),
    true,
  );
  await applyDraft.getByRole('button', { name: 'Use Draft', exact: true }).click();
  assert.equal(
    await page.getByLabel('Title *', { exact: true }).inputValue(),
    'Demo portal recovery',
  );
  await page
    .getByRole('textbox', { name: 'Article content', exact: true })
    .getByText('Review service health and confirm recovery before closing the incident.', {
      exact: true,
    })
    .waitFor();
  await page.getByRole('region', { name: 'Draft with AI', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${output}/ai-drafting.png` });
  await page.goto(`${base}/knowledge`);
  await page.getByLabel('Question', { exact: true }).fill('How do we verify portal recovery?');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await page.getByRole('link', { name: '[1] Demo portal recovery guide', exact: true }).waitFor();
  await page.screenshot({ path: `${output}/ai-knowledge.png` });
  await page.goto(`${base}/on-call`);
  const headerReference = page
    .locator('.record-sticky-header')
    .getByRole('combobox', { name: 'Service', exact: true });
  await headerReference.click();
  const serviceOptions = page.getByRole('listbox', { name: 'Service', exact: true });
  await serviceOptions.waitFor();
  assert.equal(
    await serviceOptions.evaluate((element) =>
      element.closest('[popover]').matches(':popover-open'),
    ),
    true,
  );
  assert.equal(
    await headerReference.evaluate((element) => getComputedStyle(element).borderTopWidth),
    '0px',
  );
  assert.equal(
    await headerReference.evaluate(
      (element) => getComputedStyle(element.closest('.reference-control')).borderTopWidth,
    ),
    '1px',
  );
  await page.getByRole('option', { name: 'Demo Customer Portal', exact: true }).click();
  await page.goto(`${base}/dashboard`);
  await page.getByRole('heading', { name: 'Important Reports', exact: true }).waitFor();
  const dashboardAlignment = await page.evaluate(() => {
    const picker = document.querySelector('[aria-label="Dashboard View"]').getBoundingClientRect();
    const refresh = document.querySelector('button[title="Refresh dashboard"]');
    const cards = document
      .querySelector('.dashboard-header')
      .nextElementSibling.querySelector('.panel')
      .parentElement.getBoundingClientRect();
    const button = refresh.getBoundingClientRect();
    return {
      left: Math.abs(picker.left - cards.left),
      right: Math.abs(button.right - cards.right),
      background: getComputedStyle(refresh).backgroundColor,
    };
  });
  assert.ok(
    dashboardAlignment.left < 2 && dashboardAlignment.right < 2,
    'Dashboard controls align with the card edges',
  );
  assert.equal(dashboardAlignment.background, 'rgba(0, 0, 0, 0)');
  await page.screenshot({ path: `${output}/dashboard-overview.png` });
  await page.goto(`${base}/dashboard/reports?report=urgent`);
  await page
    .getByRole('heading', { name: 'Critical / High Unresolved Incidents', exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByText(
        'Records matching the dashboard report. Search and export remain within this scope.',
        { exact: true },
      )
      .count(),
    0,
  );
  const listAlignment = await page.evaluate(() => {
    const header = document.querySelector('.record-sticky-header');
    const crumb = header.querySelector('nav').getBoundingClientRect();
    const actions = header.querySelector('button').getBoundingClientRect();
    return Math.abs((crumb.top + crumb.bottom) / 2 - (actions.top + actions.bottom) / 2);
  });
  assert.ok(listAlignment < 2, 'List breadcrumbs and actions align in one row');
  await page.goto(`${base}/status`);
  await page.getByText('Demo Customer Portal', { exact: true }).waitFor();
  await page.screenshot({ path: `${output}/status-background.png` });
  await page.goto(`${base}/status/settings`);
  const hexColour = page.getByRole('textbox', { name: 'Page Background Colour Hex', exact: true });
  await hexColour.waitFor();
  await page.getByRole('button', { name: 'Use App Theme', exact: true }).click();
  assert.equal(await hexColour.inputValue(), '');
  await hexColour.fill('#e7f3ed');
  await page.screenshot({ path: `${output}/status-settings.png` });

  await page.goto(`${base}/profile`);
  await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  await page.getByRole('heading', { name: 'Theme', exact: true }).evaluate((element) => {
    const root = element.closest('.record-scroll-area');
    if (root) {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
      root.scrollTop += element.getBoundingClientRect().top - root.getBoundingClientRect().top - 16;
    }
  });
  await page.screenshot({ path: `${output}/readme-themes-dark.png` });
  await page.goto(`${base}/dashboard`);
  await page.getByRole('heading', { name: 'Important Reports', exact: true }).waitFor();
  await page.evaluate(() => {
    const section = [...document.querySelectorAll('h2')]
      .find((item) => item.textContent === 'Incident Severity')
      .closest('section');
    const header = document.querySelector('.record-sticky-header');
    window.scrollTo({
      left: 0,
      top:
        window.scrollY +
        section.getBoundingClientRect().top -
        header.getBoundingClientRect().height -
        16,
      behavior: 'instant',
    });
  });
  await page.screenshot({ path: `${output}/readme-dashboard-dark.png` });
  await page.goto(`${base}/tasks`);
  await page.getByRole('region', { name: 'Demo Review task cards', exact: true }).waitFor();
  await page.screenshot({ path: `${output}/readme-tasks-dark.png` });
  await page.goto(`${base}/knowledge/eeeeeeeeeeeeeeeeeeeeeeee`);
  await page.getByRole('heading', { name: 'Step-by-Step Process', exact: true }).waitFor();
  await page.getByText(/Loading article/).waitFor({ state: 'hidden' });
  await page.screenshot({ path: `${output}/readme-runbook-dark.png` });

  assert.deepEqual(faults, []);
  console.log(
    'Captured twenty-two demo-only screenshots, including four dark-mode README images; verified task ordering and loading, knowledge bases and runbooks, accessible labels, global lanes, AI gating and drafts, themes, date formats, and record header alignment.',
  );
} catch (error) {
  console.log('Browser faults', faults);
  throw error;
} finally {
  await browser.close();
}
