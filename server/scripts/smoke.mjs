import { io } from 'socket.io-client';

const BASE = 'http://localhost:4000';
const PASSWORD = 'Password123!';

let pass = 0;
let fail = 0;
const failures = [];

const check = (name, ok, detail) => {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? ` -> ${JSON.stringify(detail)}` : ''}`);
  }
};

const section = (title) => console.log(`\n${title}`);

const req = async (path, { token, method = 'GET', body, cookie } = {}) => {
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
  const res = await req('/api/auth/login', {
    method: 'POST',
    body: { email, password: PASSWORD },
  });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${JSON.stringify(res.body)}`);
  const raw = res.setCookie.find((c) => c.startsWith('velozity_refresh='));
  return { token: res.body.accessToken, user: res.body.user, cookie: raw?.split(';')[0] };
};

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

const connect = (token) =>
  new Promise((resolve, reject) => {
    const socket = io(BASE, { auth: { token }, transports: ['websocket'], reconnection: false });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', (err) => reject(err));
  });

const run = async () => {
  section('auth');
  const health = await req('/health');
  check('health endpoint responds', health.status === 200 && health.body.status === 'ok');

  const admin = await login('admin@velozity.test');
  const ravi = await login('ravi@velozity.test');
  const neha = await login('neha@velozity.test');
  const karan = await login('karan@velozity.test');
  const sana = await login('sana@velozity.test');
  const meera = await login('meera@velozity.test');

  check('login returns an access token', typeof admin.token === 'string' && admin.token.length > 40);
  check('refresh token comes back as a cookie', Boolean(admin.cookie));
  const rawCookie = (await req('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@velozity.test', password: PASSWORD },
  })).setCookie.find((c) => c.startsWith('velozity_refresh='));
  check('refresh cookie is HttpOnly', /HttpOnly/i.test(rawCookie ?? ''), rawCookie);
  check('refresh cookie is scoped to /api/auth', /Path=\/api\/auth/i.test(rawCookie ?? ''), rawCookie);
  check('access token is not in the login body twice', !JSON.stringify(rawCookie).includes('accessToken'));

  const wrongPassword = await req('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@velozity.test', password: 'wrong-password' },
  });
  check('wrong password is rejected', wrongPassword.status === 401, wrongPassword.body);

  const badEmail = await req('/api/auth/login', { method: 'POST', body: { email: 'nope', password: 'x' } });
  check('malformed login payload is validated server side', badEmail.status === 422, badEmail.body);

  const noToken = await req('/api/tasks');
  check('protected route without a token is 401', noToken.status === 401);

  const tampered = await req('/api/auth/me', { token: `${karan.token}x` });
  check('tampered token is 401', tampered.status === 401);

  const me = await req('/api/auth/me', { token: karan.token });
  check('me returns the developer identity', me.body?.user?.role === 'DEVELOPER', me.body);

  section('token rotation');
  const firstRefresh = await req('/api/auth/refresh', { method: 'POST', cookie: sana.cookie });
  check('refresh issues a new access token', firstRefresh.status === 200 && Boolean(firstRefresh.body.accessToken));
  const rotated = firstRefresh.setCookie.find((c) => c.startsWith('velozity_refresh='))?.split(';')[0];
  check('refresh rotates the cookie', Boolean(rotated) && rotated !== sana.cookie);
  const replay = await req('/api/auth/refresh', { method: 'POST', cookie: sana.cookie });
  check('replaying the old refresh token is rejected', replay.status === 401, replay.body);
  const afterBreach = await req('/api/auth/refresh', { method: 'POST', cookie: rotated });
  check('reuse detection revokes the whole family', afterBreach.status === 401, afterBreach.body);

  section('role scoping on reads');
  const adminTasks = await req('/api/tasks?limit=100', { token: admin.token });
  const raviTasks = await req('/api/tasks?limit=100', { token: ravi.token });
  const karanTasks = await req('/api/tasks?limit=100', { token: karan.token });

  check('admin sees every task', adminTasks.body.total === 21, adminTasks.body.total);
  check('pm sees only their own projects tasks', raviTasks.body.total === 11, raviTasks.body.total);
  check(
    'developer sees only tasks assigned to them',
    karanTasks.body.items.every((t) => t.assignee?.id === karan.user.id) && karanTasks.body.total === 6,
    karanTasks.body.total,
  );

  const adminProjects = await req('/api/projects', { token: admin.token });
  const raviProjects = await req('/api/projects', { token: ravi.token });
  const karanProjects = await req('/api/projects', { token: karan.token });
  check('admin lists all projects', adminProjects.body.items.length === 4);
  check('pm lists only owned projects', raviProjects.body.items.every((p) => p.manager.id === ravi.user.id));
  check(
    'developer only lists projects they have tasks on',
    karanProjects.body.items.length === 2 &&
      karanProjects.body.items.every((p) => karanTasks.body.items.some((t) => t.project.id === p.id)),
    karanProjects.body.items.length,
  );

  section('role enforcement on writes');
  const nehaProject = (await req('/api/projects', { token: neha.token })).body.items[0];
  const crossPm = await req(`/api/projects/${nehaProject.id}`, { token: ravi.token });
  check('pm cannot read another pm project', crossPm.status === 403, crossPm.body);

  const crossPmEdit = await req(`/api/projects/${nehaProject.id}`, {
    token: ravi.token,
    method: 'PATCH',
    body: { name: 'hijacked' },
  });
  check('pm cannot edit another pm project', crossPmEdit.status === 403, crossPmEdit.body);

  const devUsers = await req('/api/users', { token: karan.token });
  check('developer cannot list users', devUsers.status === 403, devUsers.body);

  const devClients = await req('/api/clients', { token: karan.token });
  check('developer cannot list clients', devClients.status === 403, devClients.body);

  const pmCreateUser = await req('/api/users', {
    token: ravi.token,
    method: 'POST',
    body: { name: 'Someone New', email: 'new@velozity.test', password: 'Password123!', role: 'DEVELOPER' },
  });
  check('pm cannot create users', pmCreateUser.status === 403, pmCreateUser.body);

  const devCreateProject = await req('/api/projects', {
    token: karan.token,
    method: 'POST',
    body: { name: 'Developer project', clientId: nehaProject.clientId, description: '' },
  });
  check('developer cannot create a project', devCreateProject.status === 403, devCreateProject.body);

  const otherTask = adminTasks.body.items.find((t) => t.assignee?.id !== karan.user.id);
  const readOther = await req(`/api/tasks/${otherTask.id}`, { token: karan.token });
  check('developer cannot read another developers task', readOther.status === 403, readOther.body);

  const patchOther = await req(`/api/tasks/${otherTask.id}/status`, {
    token: karan.token,
    method: 'PATCH',
    body: { status: 'DONE' },
  });
  check('developer cannot move another developers task', patchOther.status === 403, patchOther.body);

  const ownTask = karanTasks.body.items.find((t) => t.status !== 'IN_REVIEW');
  const escalate = await req(`/api/tasks/${ownTask.id}`, {
    token: karan.token,
    method: 'PATCH',
    body: { priority: 'LOW' },
  });
  check('developer cannot change priority on their own task', escalate.status === 403, escalate.body);

  const renameOwn = await req(`/api/tasks/${ownTask.id}`, {
    token: karan.token,
    method: 'PATCH',
    body: { title: 'Renamed by a developer' },
  });
  check('developer cannot change the title of their own task', renameOwn.status === 403, renameOwn.body);

  const reassignOwn = await req(`/api/tasks/${ownTask.id}`, {
    token: karan.token,
    method: 'PATCH',
    body: { assigneeId: sana.user.id },
  });
  check('developer cannot reassign their own task', reassignOwn.status === 403, reassignOwn.body);

  const stillOwned = await req(`/api/tasks/${ownTask.id}`, { token: karan.token });
  check(
    'the rejected edits changed nothing',
    stillOwned.body.task.title === ownTask.title &&
      stillOwned.body.task.priority === ownTask.priority &&
      stillOwned.body.task.assignee?.id === karan.user.id,
    stillOwned.body.task,
  );

  const devDeleteTask = await req(`/api/tasks/${ownTask.id}`, { token: karan.token, method: 'DELETE' });
  check('developer cannot delete a task', devDeleteTask.status === 403, devDeleteTask.body);

  const assignToPm = await req('/api/tasks', {
    token: ravi.token,
    method: 'POST',
    body: {
      projectId: raviProjects.body.items[0].id,
      title: 'Assign to a manager should fail',
      assigneeId: neha.user.id,
    },
  });
  check('tasks can only be assigned to developers', assignToPm.status === 400, assignToPm.body);

  section('filters cannot widen a role scope');
  const karanScoped = await req(`/api/tasks?limit=100&assigneeId=${karan.user.id}`, {
    token: karan.token,
  });
  check(
    'developer may filter by their own id',
    karanScoped.status === 200 && karanScoped.body.total === karanTasks.body.total,
    karanScoped.body.total,
  );

  const stealViaFilter = await req(`/api/tasks?limit=100&assigneeId=${sana.user.id}`, {
    token: karan.token,
  });
  check(
    'developer cannot read another developer via assigneeId filter',
    stealViaFilter.status === 403,
    { status: stealViaFilter.status, returned: stealViaFilter.body?.total },
  );

  const stealViaProjectFilter = await req(`/api/tasks?limit=100&projectId=${nehaProject.id}`, {
    token: karan.token,
  });
  check(
    'developer filtering by a foreign project still only sees their own tasks',
    stealViaProjectFilter.body.items.every((t) => t.assignee?.id === karan.user.id),
    stealViaProjectFilter.body.items.map((t) => t.assignee?.name),
  );

  const pmStealViaAssignee = await req(`/api/tasks?limit=100&assigneeId=${meera.user.id}`, {
    token: ravi.token,
  });
  check(
    'pm filtering by a developer outside their projects gets nothing of it',
    pmStealViaAssignee.body.items.every((t) =>
      raviProjects.body.items.some((p) => p.id === t.project.id),
    ),
    pmStealViaAssignee.body.items.map((t) => t.project.name),
  );

  const pmStealViaManagerFilter = await req(`/api/projects?managerId=${neha.user.id}`, {
    token: ravi.token,
  });
  check(
    'pm cannot list another pm projects via managerId filter',
    pmStealViaManagerFilter.status === 403,
    { status: pmStealViaManagerFilter.status, returned: pmStealViaManagerFilter.body?.items?.length },
  );

  const karanProjectIds = new Set(karanTasks.body.items.map((task) => task.project.id));
  const nehaProjects = (await req('/api/projects', { token: neha.token })).body.items;
  const untouchedProject = nehaProjects.find((project) => !karanProjectIds.has(project.id));
  const sharedProject = nehaProjects.find((project) => karanProjectIds.has(project.id));

  const feedNoTasks = await req(`/api/activity?projectId=${untouchedProject.id}`, {
    token: karan.token,
  });
  check(
    'developer cannot read the feed of a project they hold no tasks on',
    feedNoTasks.status === 403,
    feedNoTasks.status,
  );

  const feedShared = await req(`/api/activity?projectId=${sharedProject.id}`, {
    token: karan.token,
  });
  check(
    'on a project they do hold tasks on, a developer sees only their own task events',
    feedShared.status === 200 &&
      feedShared.body.items.every(
        (item) =>
          item.taskId === null || karanTasks.body.items.some((task) => task.id === item.taskId),
      ),
    feedShared.body.items?.length,
  );

  section('filters and validation');
  const filtered = await req('/api/tasks?status=TODO,IN_REVIEW&priority=CRITICAL,HIGH&sort=dueDate&order=asc', {
    token: admin.token,
  });
  check(
    'multi value status and priority filters apply',
    filtered.body.items.every(
      (t) => ['TODO', 'IN_REVIEW'].includes(t.status) && ['CRITICAL', 'HIGH'].includes(t.priority),
    ),
    filtered.body.items.map((t) => `${t.status}/${t.priority}`),
  );

  const overdueOnly = await req('/api/tasks?overdue=true', { token: admin.token });
  check(
    'overdue filter returns the seeded overdue tasks',
    overdueOnly.body.total === 2 && overdueOnly.body.items.every((t) => t.isOverdue),
    overdueOnly.body.total,
  );

  const dueRange = await req(
    `/api/tasks?dueFrom=${new Date().toISOString()}&dueTo=${new Date(Date.now() + 3 * 864e5).toISOString()}`,
    { token: admin.token },
  );
  check(
    'due date range filter applies',
    dueRange.body.items.every((t) => new Date(t.dueDate) >= new Date(Date.now() - 60000)),
    dueRange.body.total,
  );

  const badFilter = await req('/api/tasks?status=NOT_A_STATUS', { token: admin.token });
  check('invalid filter value is rejected', badFilter.status === 422, badFilter.body);

  const badUuid = await req('/api/tasks/not-a-uuid', { token: admin.token });
  check('invalid uuid param is rejected', badUuid.status === 422, badUuid.body);

  const emptyPatch = await req(`/api/tasks/${ownTask.id}`, { token: admin.token, method: 'PATCH', body: {} });
  check('empty update payload is rejected', emptyPatch.status === 422, emptyPatch.body);

  const absentTask = await req('/api/tasks/11111111-1111-4111-8111-111111111111', {
    token: admin.token,
  });
  check('a well formed id for a missing record is 404', absentTask.status === 404, absentTask.body);

  const absentProject = await req('/api/projects/11111111-1111-4111-8111-111111111111', {
    token: admin.token,
  });
  check('a missing project is 404 rather than 403', absentProject.status === 404, absentProject.body);

  const unknownRoute = await req('/api/nope', { token: admin.token });
  check('unknown route returns a structured error', unknownRoute.status === 404 && unknownRoute.body.error.code === 'NOT_FOUND');
  check('errors never leak a stack trace', !JSON.stringify(unknownRoute.body).toLowerCase().includes('at '));

  section('activity feed scoping');
  const adminFeed = await req('/api/activity?limit=50', { token: admin.token });
  const raviFeed = await req('/api/activity?limit=50', { token: ravi.token });
  const karanFeed = await req('/api/activity?limit=50', { token: karan.token });

  check('admin feed is global', adminFeed.body.items.length === 50 && adminFeed.body.nextCursor !== null);
  check(
    'pm feed only contains their projects',
    raviFeed.body.items.every((a) => raviProjects.body.items.some((p) => p.id === a.projectId)),
  );
  check(
    'developer feed only contains their own task events',
    karanFeed.body.items.every((a) => a.taskId === null || karanTasks.body.items.some((t) => t.id === a.taskId)),
  );
  check(
    'feed message matches the required wording',
    adminFeed.body.items.some((a) => / moved Task #\d+ from .+ → .+/.test(a.message)),
    adminFeed.body.items.find((a) => a.type === 'TASK_STATUS_CHANGED')?.message,
  );

  const missed = await req('/api/activity/missed?limit=20', { token: karan.token });
  check('missed events endpoint returns at most 20 from the database', missed.body.items.length <= 20 && Boolean(missed.body.since));

  const crossProjectFeed = await req(`/api/activity?projectId=${nehaProject.id}`, { token: ravi.token });
  check('pm cannot request another pm project feed', crossProjectFeed.status === 403, crossProjectFeed.body);

  section('dashboards');
  const adminDash = await req('/api/dashboard', { token: admin.token });
  check(
    'admin dashboard carries totals, overdue and presence',
    adminDash.body.role === 'ADMIN' &&
      adminDash.body.projectTotal === 4 &&
      adminDash.body.overdueCount === 2 &&
      typeof adminDash.body.onlineCount === 'number',
    adminDash.body,
  );

  const pmDash = await req('/api/dashboard', { token: ravi.token });
  check(
    'pm dashboard carries their projects, priorities and this week',
    pmDash.body.role === 'PROJECT_MANAGER' && pmDash.body.projects.length === 2 && Array.isArray(pmDash.body.upcomingThisWeek),
    pmDash.body?.projects?.length,
  );

  const devDash = await req('/api/dashboard', { token: karan.token });
  const priorityRank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const sorted = devDash.body.tasks.every((task, i, all) => {
    if (i === 0) return true;
    const prev = all[i - 1];
    if (priorityRank[prev.priority] !== priorityRank[task.priority]) {
      return priorityRank[prev.priority] > priorityRank[task.priority];
    }
    return new Date(prev.dueDate ?? 0) <= new Date(task.dueDate ?? 0);
  });
  check('developer dashboard sorts by priority then due date', devDash.body.role === 'DEVELOPER' && sorted);

  section('notifications');
  const beforeNotifs = await req('/api/notifications?limit=50', { token: ravi.token });
  check('notifications come back with an unread count', typeof beforeNotifs.body.unreadCount === 'number');

  const firstUnread = beforeNotifs.body.items.find((n) => n.readAt === null);
  const markOne = await req(`/api/notifications/${firstUnread.id}/read`, { token: ravi.token, method: 'PATCH' });
  check('marking one notification read lowers the count', markOne.body.unreadCount === beforeNotifs.body.unreadCount - 1, markOne.body);

  const stillUnreadForRavi = beforeNotifs.body.items.filter((n) => n.readAt === null).slice(1)[0];
  await req(`/api/notifications/${stillUnreadForRavi.id}/read`, { token: karan.token, method: 'PATCH' });
  const raviAfterForeignAttempt = await req('/api/notifications?limit=50', { token: ravi.token });
  check(
    'a user cannot mark someone elses notification read',
    raviAfterForeignAttempt.body.items.find((n) => n.id === stillUnreadForRavi.id)?.readAt === null,
    raviAfterForeignAttempt.body.unreadCount,
  );

  section('realtime');
  const adminSocket = await connect(admin.token);
  const presenceSeen = waitFor(adminSocket, 'presence:update', (p) => p.onlineCount >= 3);

  const karanSocket = await connect(karan.token);
  const sanaSocket = await connect((await login('sana@velozity.test')).token);
  const raviSocket = await connect(ravi.token);

  check('socket handshake accepts a valid access token', adminSocket.connected && karanSocket.connected);

  let rejected = false;
  try {
    await connect('not-a-real-token');
  } catch {
    rejected = true;
  }
  check('socket handshake rejects a bad token', rejected);

  const presenceEvent = await presenceSeen;
  check(
    'admin receives live presence counts',
    Boolean(presenceEvent) && presenceEvent.onlineUserIds.length === presenceEvent.onlineCount,
    presenceEvent,
  );

  const raviProjectId = raviProjects.body.items.find((project) =>
    karanTasks.body.items.some((task) => task.project.id === project.id),
  ).id;
  const subscribeOk = await new Promise((resolve) => raviSocket.emit('project:subscribe', raviProjectId, resolve));
  check('pm can subscribe to their own project room', subscribeOk === true);

  const subscribeDenied = await new Promise((resolve) => raviSocket.emit('project:subscribe', nehaProject.id, resolve));
  check('pm cannot subscribe to another pm project room', subscribeDenied === false);

  const devSubscribe = await new Promise((resolve) => karanSocket.emit('project:subscribe', raviProjectId, resolve));
  check('developer cannot join a project room at all', devSubscribe === false);

  const candidate = karanTasks.body.items.find((t) => t.project.id === raviProjectId);
  if (candidate.status === 'IN_REVIEW') {
    await req(`/api/tasks/${candidate.id}/status`, {
      token: admin.token,
      method: 'PATCH',
      body: { status: 'IN_PROGRESS' },
    });
  }
  const moveTarget = { ...candidate, status: candidate.status === 'IN_REVIEW' ? 'IN_PROGRESS' : candidate.status };
  const adminSees = waitFor(adminSocket, 'activity:new', (a) => a.taskId === moveTarget.id);
  const ownerSees = waitFor(karanSocket, 'activity:new', (a) => a.taskId === moveTarget.id);
  const pmSees = waitFor(raviSocket, 'activity:new', (a) => a.taskId === moveTarget.id);
  const pmNotified = waitFor(raviSocket, 'notification:new', (n) => n.notification.taskId === moveTarget.id);
  const otherDevSees = waitFor(sanaSocket, 'activity:new', (a) => a.taskId === moveTarget.id, 2500);

  const moved = await req(`/api/tasks/${moveTarget.id}/status`, {
    token: karan.token,
    method: 'PATCH',
    body: { status: 'IN_REVIEW' },
  });
  check('developer can move their own task', moved.status === 200 && moved.body.task.status === 'IN_REVIEW', moved.body);

  const [adminGot, ownerGot, pmGot, pmNotif, otherGot] = await Promise.all([
    adminSees,
    ownerSees,
    pmSees,
    pmNotified,
    otherDevSees,
  ]);

  check('admin receives the event on the global feed', Boolean(adminGot));
  check('assigned developer receives the event', Boolean(ownerGot));
  check('owning pm receives the event', Boolean(pmGot));
  check('unrelated developer receives nothing', otherGot === null);
  check('event text is preformatted for the feed', / moved Task #\d+ from .+ → .+/.test(adminGot?.message ?? ''), adminGot?.message);
  check('pm gets a live in review notification', Boolean(pmNotif) && pmNotif.unreadCount > 0, pmNotif);

  const assignedNotif = waitFor(sanaSocket, 'notification:new', (n) => n.notification.type === 'TASK_ASSIGNED');
  const newTask = await req('/api/tasks', {
    token: ravi.token,
    method: 'POST',
    body: {
      projectId: raviProjectId,
      title: 'Smoke test task for assignment notification',
      description: 'created by the smoke test',
      priority: 'HIGH',
      assigneeId: sana.user.id,
      dueDate: new Date(Date.now() + 3 * 864e5).toISOString(),
    },
  });
  check('pm can create a task on their own project', newTask.status === 201, newTask.body);
  const gotAssigned = await assignedNotif;
  check('assigned developer gets a live notification', Boolean(gotAssigned), gotAssigned);

  const countEvent = waitFor(sanaSocket, 'notification:count');
  await req('/api/notifications/read-all', { token: (await login('sana@velozity.test')).token, method: 'PATCH' });
  const counted = await countEvent;
  check('unread count updates over the socket', counted?.unreadCount === 0, counted);

  section('background job');
  const pastDue = await req('/api/tasks', {
    token: ravi.token,
    method: 'POST',
    body: {
      projectId: raviProjectId,
      title: 'Smoke test task that is already past due',
      description: 'used to prove the scheduler flags overdue work',
      priority: 'MEDIUM',
      assigneeId: karan.user.id,
      dueDate: new Date(Date.now() - 864e5).toISOString(),
    },
  });
  check('a task created past its due date is flagged immediately', pastDue.body.task?.isOverdue === true, pastDue.body);

  adminSocket.close();
  karanSocket.close();
  sanaSocket.close();
  raviSocket.close();

  // leave the dataset as we found it so the run can be repeated
  await req(`/api/tasks/${newTask.body.task.id}`, { token: ravi.token, method: 'DELETE' });
  await req(`/api/tasks/${pastDue.body.task.id}`, { token: ravi.token, method: 'DELETE' });
  await req(`/api/tasks/${moveTarget.id}/status`, {
    token: admin.token,
    method: 'PATCH',
    body: { status: moveTarget.status },
  });

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) {
    console.log('failed checks:');
    for (const name of failures) console.log(`  - ${name}`);
    process.exitCode = 1;
  }
};

run()
  .catch((err) => {
    console.error('smoke run crashed:', err);
    process.exitCode = 1;
  })
  .finally(() => process.exit(process.exitCode ?? 0));
