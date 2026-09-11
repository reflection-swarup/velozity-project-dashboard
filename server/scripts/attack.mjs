/**
 * Adversarial pre-deployment checklist, written to attack the API from the
 * outside rather than to exercise the happy paths the smoke suite covers.
 * Run against a seeded, running API: node scripts/attack.mjs
 *
 * It restores every record it changes, but the activity log is append-only by
 * design, so the events it generates stay in the feed. Re-seed afterwards if
 * you run this against an environment somebody is going to look at:
 *
 *   DATABASE_URL=<target> npm run seed
 */
import { io } from 'socket.io-client';

const BASE = process.env.ATTACK_BASE ?? 'http://localhost:4000';
const PASSWORD = 'Password123!';

let pass = 0;
const failures = [];

const check = (name, ok, detail) => {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failures.push(name);
    console.log(`  FAIL  ${name}${detail !== undefined ? ` -> ${JSON.stringify(detail)}` : ''}`);
  }
};

const call = async (path, { token, method = 'GET', body, cookie } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, body: json, setCookie: res.headers.getSetCookie?.() ?? [] };
};

const login = async (email) => {
  const res = await call('/api/auth/login', { method: 'POST', body: { email, password: PASSWORD } });
  if (res.status === 429) {
    throw new Error(`login rate limited for ${email}; wait for the window to reset`);
  }
  if (res.status !== 200) {
    throw new Error(`login failed for ${email}: ${JSON.stringify(res.body)}`);
  }
  const raw = res.setCookie.find((c) => c.startsWith('velozity_refresh='));
  return { token: res.body.accessToken, user: res.body.user, cookie: raw?.split(';')[0], raw };
};

const connect = (token) =>
  new Promise((resolve, reject) => {
    const socket = io(BASE, { auth: { token }, transports: ['websocket'], reconnection: false });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });

const waitFor = (socket, event, predicate, timeout = 4000) =>
  new Promise((resolve) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      resolve(null);
    }, timeout);
    const handler = (payload) => {
      if (predicate && !predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    };
    socket.on(event, handler);
  });

const run = async () => {
  const admin = await login('admin@velozity.test');
  const ravi = await login('ravi@velozity.test');
  const neha = await login('neha@velozity.test');
  const karan = await login('karan@velozity.test');
  const sana = await login('sana@velozity.test');

  const karanTasks = (await call('/api/tasks?limit=100', { token: karan.token })).body;
  const sanaTasks = (await call('/api/tasks?limit=100', { token: sana.token })).body;
  const raviProjects = (await call('/api/projects', { token: ravi.token })).body.items;
  const nehaProjects = (await call('/api/projects', { token: neha.token })).body.items;

  console.log('\nTest 1 — developer isolation');
  check(
    'own list returns only their tasks',
    karanTasks.items.every((t) => t.assignee?.id === karan.user.id),
    karanTasks.total,
  );
  const byOther = await call(`/api/tasks?limit=100&assigneeId=${sana.user.id}`, {
    token: karan.token,
  });
  check('assigneeId of another developer is refused', byOther.status === 403, byOther.status);
  check(
    'no task of the other developer is returned',
    (byOther.body.items ?? []).length === 0,
    (byOther.body.items ?? []).length,
  );

  console.log('\nTest 2 — developer reaching another project directly');
  const foreign = nehaProjects.find(
    (p) => !karanTasks.items.some((t) => t.project.id === p.id),
  );
  const foreignProject = await call(`/api/projects/${foreign.id}`, { token: karan.token });
  check('a project they hold no tasks on is refused', foreignProject.status === 403, foreignProject.status);

  console.log('\nTest 3 — developer modifying another developer task');
  const notMine = sanaTasks.items[0];
  const readOther = await call(`/api/tasks/${notMine.id}`, { token: karan.token });
  check('reading it is refused', readOther.status === 403, readOther.status);
  const patchOther = await call(`/api/tasks/${notMine.id}/status`, {
    token: karan.token,
    method: 'PATCH',
    body: { status: 'DONE' },
  });
  check('moving it is refused', patchOther.status === 403, patchOther.status);

  console.log('\nTest 4 — developer changing the assignee of their own task');
  const mine = karanTasks.items[0];
  const reassign = await call(`/api/tasks/${mine.id}`, {
    token: karan.token,
    method: 'PATCH',
    body: { assigneeId: sana.user.id },
  });
  check('reassigning is refused', reassign.status === 403, reassign.status);
  const after = await call(`/api/tasks/${mine.id}`, { token: karan.token });
  check('the assignee is unchanged', after.body.task.assignee?.id === karan.user.id);

  console.log('\nTest 5 — project manager isolation');
  check(
    'their list contains only their own projects',
    raviProjects.every((p) => p.manager.id === ravi.user.id),
    raviProjects.length,
  );
  const crossRead = await call(`/api/projects/${nehaProjects[0].id}`, { token: ravi.token });
  check('reading another manager project is refused', crossRead.status === 403, crossRead.status);
  const crossList = await call(`/api/projects?managerId=${neha.user.id}`, { token: ravi.token });
  check('filtering by another manager is refused', crossList.status === 403, crossList.status);

  console.log('\nTest 6 — websocket isolation');
  const adminSocket = await connect(admin.token);
  const karanSocket = await connect(karan.token);
  const sanaSocket = await connect(sana.token);
  const raviSocket = await connect(ravi.token);

  const sharedProject = raviProjects.find((p) =>
    karanTasks.items.some((t) => t.project.id === p.id),
  );
  await new Promise((resolve) => raviSocket.emit('project:subscribe', sharedProject.id, resolve));

  const target = karanTasks.items.find(
    (t) => t.project.id === sharedProject.id && t.status !== 'IN_REVIEW',
  );
  const original = target.status;

  const adminSees = waitFor(adminSocket, 'activity:new', (a) => a.taskId === target.id);
  const ownerSees = waitFor(karanSocket, 'activity:new', (a) => a.taskId === target.id);
  const pmSees = waitFor(raviSocket, 'activity:new', (a) => a.taskId === target.id);
  const otherDevSees = waitFor(sanaSocket, 'activity:new', (a) => a.taskId === target.id, 2500);

  await call(`/api/tasks/${target.id}/status`, {
    token: karan.token,
    method: 'PATCH',
    body: { status: 'IN_REVIEW' },
  });

  const [a, o, pm, other] = await Promise.all([adminSees, ownerSees, pmSees, otherDevSees]);
  check('admin receives the event', Boolean(a));
  check('the assigned developer receives it', Boolean(o));
  check('the owning manager receives it', Boolean(pm));
  check('the other developer receives nothing', other === null);

  console.log('\nTest 7 — offline catch-up');
  const beforeSeen = await call('/api/activity/missed?limit=20', { token: sana.token });
  check('missed returns a since timestamp and at most 20 rows', Boolean(beforeSeen.body.since) && beforeSeen.body.items.length <= 20, beforeSeen.body.items.length);
  check(
    'catch-up is scoped to the caller',
    beforeSeen.body.items.every(
      (item) => item.taskId === null || sanaTasks.items.some((t) => t.id === item.taskId),
    ),
  );

  console.log('\nTest 8 — overdue is the scheduler only');
  const pastDue = await call('/api/tasks', {
    token: ravi.token,
    method: 'POST',
    body: {
      projectId: sharedProject.id,
      title: 'Attack script past due task',
      description: 'created by scripts/attack.mjs',
      priority: 'LOW',
      assigneeId: karan.user.id,
      dueDate: new Date(Date.now() - 864e5).toISOString(),
    },
  });
  check('the api does not flag it on create', pastDue.body.task?.isOverdue === false, pastDue.body.task?.isOverdue);
  const seededOverdue = await call('/api/tasks?overdue=true&limit=100', { token: admin.token });
  check(
    'existing overdue tasks carry a timestamp and an activity trail',
    seededOverdue.body.items.length > 0 && seededOverdue.body.items.every((t) => t.overdueAt),
    seededOverdue.body.items.length,
  );

  console.log('\nTest 9 — token handling');
  check('refresh cookie is HttpOnly', /HttpOnly/i.test(karan.raw ?? ''));
  check('refresh cookie is path scoped', /Path=\/api\/auth/i.test(karan.raw ?? ''));
  check('login response carries no refresh token in the body', !JSON.stringify((await call('/api/auth/login', { method: 'POST', body: { email: 'karan@velozity.test', password: PASSWORD } })).body).includes('refresh'));
  const rotated = await call('/api/auth/refresh', { method: 'POST', cookie: sana.cookie });
  check('refresh returns a new access token', rotated.status === 200 && Boolean(rotated.body.accessToken));
  const replay = await call('/api/auth/refresh', { method: 'POST', cookie: sana.cookie });
  check('replaying the old cookie is refused', replay.status === 401, replay.status);

  // put the world back
  await call(`/api/tasks/${target.id}/status`, {
    token: admin.token,
    method: 'PATCH',
    body: { status: original },
  });
  await call(`/api/tasks/${pastDue.body.task.id}`, { token: ravi.token, method: 'DELETE' });

  adminSocket.close();
  karanSocket.close();
  sanaSocket.close();
  raviSocket.close();

  console.log(`\n${pass} passed, ${failures.length} failed`);
  for (const name of failures) console.log(`  - ${name}`);
  if (failures.length > 0) process.exitCode = 1;
};

run()
  .catch((err) => {
    console.error('attack run crashed:', err);
    process.exitCode = 1;
  })
  .finally(() => process.exit(process.exitCode ?? 0));
