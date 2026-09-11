/**
 * Manual demo triggers. Every action goes through the real HTTP API, so it
 * takes the same code path, writes the same activity row and emits the same
 * WebSocket event a real user would.
 *
 *   node scripts/demo.mjs overdue   plant past-due tasks for the sweep to flag
 *   node scripts/demo.mjs assign    assign a new task to a developer
 *   node scripts/demo.mjs review    move a developer task into In Review
 *   node scripts/demo.mjs status    walk a task To Do -> In Progress -> In Review
 *   node scripts/demo.mjs state     print what is currently overdue
 */
const BASE = process.env.DEMO_BASE ?? 'http://localhost:4000';
const PASSWORD = 'Password123!';

const call = async (path, { token, method = 'GET', body } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};

const login = async (email) => {
  const res = await call('/api/auth/login', { method: 'POST', body: { email, password: PASSWORD } });
  if (res.status !== 200) throw new Error(`login failed for ${email}`);
  return { token: res.body.accessToken, user: res.body.user };
};

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

const developerNamed = async (adminToken, email) => {
  const users = await call('/api/users?role=DEVELOPER', { token: adminToken });
  return users.body.items.find((user) => user.email === email);
};

const overdue = async () => {
  const ravi = await login('ravi@velozity.test');
  const projects = (await call('/api/projects', { token: ravi.token })).body.items;
  const project = projects[0];

  const karan = await developerNamed(ravi.token, 'karan@velozity.test');
  const sana = await developerNamed(ravi.token, 'sana@velozity.test');

  const plan = [
    { title: 'Demo · payment webhook retry', assignee: karan, minutes: 90, priority: 'CRITICAL' },
    { title: 'Demo · staging data refresh', assignee: sana, minutes: 45, priority: 'HIGH' },
  ];

  for (const item of plan) {
    const created = await call('/api/tasks', {
      token: ravi.token,
      method: 'POST',
      body: {
        projectId: project.id,
        title: item.title,
        description: 'Planted by scripts/demo.mjs to watch the scheduler flag it.',
        priority: item.priority,
        assigneeId: item.assignee.id,
        dueDate: minutesAgo(item.minutes),
      },
    });

    const task = created.body.task;
    console.log(
      `planted Task #${task.number} for ${item.assignee.name} · due ${item.minutes} min ago · isOverdue=${task.isOverdue}`,
    );
  }

  console.log('');
  console.log(`project      : ${project.name}`);
  console.log('these are NOT flagged yet, because only the scheduler raises that flag.');
  console.log('watch the feed: the next sweep will post them as System, and notify the assignees.');
};

const assign = async () => {
  const ravi = await login('ravi@velozity.test');
  const project = (await call('/api/projects', { token: ravi.token })).body.items[0];
  const karan = await developerNamed(ravi.token, 'karan@velozity.test');

  const created = await call('/api/tasks', {
    token: ravi.token,
    method: 'POST',
    body: {
      projectId: project.id,
      title: `Demo · rate limit the login endpoint (${new Date().toLocaleTimeString()})`,
      description: 'Created by scripts/demo.mjs to fire an assignment notification.',
      priority: 'HIGH',
      assigneeId: karan.id,
      dueDate: new Date(Date.now() + 3 * 864e5).toISOString(),
    },
  });

  console.log(`Ravi created Task #${created.body.task.number} and assigned it to ${karan.name}`);
  console.log('expect: activity for admin + Ravi + Karan, and a notification badge for Karan.');
};

const review = async () => {
  const karan = await login('karan@velozity.test');
  const mine = (await call('/api/tasks?limit=100&status=TODO,IN_PROGRESS', { token: karan.token }))
    .body.items;

  if (mine.length === 0) {
    console.log('Karan has nothing outside review; run "assign" first.');
    return;
  }

  const task = mine[0];
  const moved = await call(`/api/tasks/${task.id}/status`, {
    token: karan.token,
    method: 'PATCH',
    body: { status: 'IN_REVIEW' },
  });

  console.log(`Karan moved Task #${task.number} from ${task.status} to IN_REVIEW`);
  console.log(`feed text : ${moved.status === 200 ? 'posted' : 'FAILED ' + moved.status}`);
  console.log('expect: admin + Ravi + Karan see the event, Sana sees nothing, Ravi gets a badge.');
};

const status = async () => {
  const karan = await login('karan@velozity.test');
  const mine = (await call('/api/tasks?limit=100', { token: karan.token })).body.items;
  const task = mine.find((t) => t.status !== 'DONE') ?? mine[0];

  for (const next of ['TODO', 'IN_PROGRESS', 'IN_REVIEW']) {
    await call(`/api/tasks/${task.id}/status`, {
      token: karan.token,
      method: 'PATCH',
      body: { status: next },
    });
    console.log(`Task #${task.number} -> ${next}`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  console.log('');
  console.log('three separate feed rows should have appeared, 1.5s apart.');
};

const state = async () => {
  const admin = await login('admin@velozity.test');
  const flagged = await call('/api/tasks?overdue=true&limit=100', { token: admin.token });
  const feed = await call('/api/activity?limit=6', { token: admin.token });

  console.log(`currently flagged overdue: ${flagged.body.total}`);
  for (const task of flagged.body.items) {
    console.log(`  #${task.number} ${task.title} · flagged ${task.overdueAt}`);
  }

  console.log('');
  console.log('newest six feed rows:');
  for (const row of feed.body.items) console.log(`  ${row.createdAt}  ${row.message}`);
};

const commands = { overdue, assign, review, status, state };
const command = process.argv[2];

if (!commands[command]) {
  console.log('usage: node scripts/demo.mjs <overdue|assign|review|status|state>');
  process.exit(1);
}

commands[command]().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
