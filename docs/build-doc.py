"""Builds a single self-contained HTML submission document with the screenshots
embedded, so it prints to PDF without needing any external files."""

import base64
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
SHOTS = ROOT / 'screenshots'
OUT = ROOT / 'velozity-submission.html'

LIVE = 'https://velozity-dashboard-ebon.vercel.app'
API = 'https://velozity-api-890n.onrender.com'
REPO = 'https://github.com/reflection-swarup/velozity-project-dashboard'


def embed(name):
    path = SHOTS / f'{name}.png'
    data = base64.b64encode(path.read_bytes()).decode()
    return f'data:image/png;base64,{data}'


def figure(name, caption, note=''):
    extra = f'<p class="note">{note}</p>' if note else ''
    return f"""<figure>
  <img src="{embed(name)}" alt="{caption}" />
  <figcaption>{caption}</figcaption>
</figure>{extra}"""


CSS = """
:root {
  --ink: #16202e;
  --muted: #55637a;
  --subtle: #7b8798;
  --line: #dfe4ec;
  --accent: #2f5fe0;
  --accent-soft: #eef3ff;
  --danger: #c02a37;
  --success: #0b6e4b;
  --warn: #8a5200;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: 'Segoe UI', -apple-system, system-ui, sans-serif;
  color: var(--ink);
  background: #f4f6f9;
  font-size: 10.5pt;
  line-height: 1.55;
}

.page {
  max-width: 210mm;
  margin: 0 auto;
  background: #fff;
  padding: 18mm 16mm;
}

h1 { font-size: 26pt; line-height: 1.15; margin: 0 0 6pt; letter-spacing: -0.4pt; }
h2 {
  font-size: 16pt; margin: 0 0 4pt; letter-spacing: -0.2pt;
  padding-bottom: 6pt; border-bottom: 2px solid var(--ink);
}
h3 { font-size: 12pt; margin: 20pt 0 6pt; }
h4 { font-size: 10.5pt; margin: 14pt 0 4pt; color: var(--muted); text-transform: uppercase; letter-spacing: 0.6pt; }
p { margin: 0 0 8pt; }
ul, ol { margin: 0 0 8pt; padding-left: 16pt; }
li { margin-bottom: 3pt; }
code { font-family: 'Cascadia Mono', Consolas, monospace; font-size: 9pt; background: #eef1f6; padding: 1px 4px; border-radius: 3px; }
a { color: var(--accent); text-decoration: none; }

.eyebrow { font-size: 8.5pt; letter-spacing: 1.4pt; text-transform: uppercase; color: var(--subtle); font-weight: 700; margin-bottom: 10pt; }
.lede { font-size: 12pt; color: var(--muted); margin-bottom: 14pt; }
.section-intro { color: var(--muted); margin: 8pt 0 14pt; }

section { page-break-before: always; padding-top: 4pt; }
section.first { page-break-before: avoid; }

table { width: 100%; border-collapse: collapse; margin: 10pt 0 14pt; font-size: 9.5pt; }
th { text-align: left; background: #f2f5fa; border-bottom: 1.5px solid var(--line); padding: 6pt 8pt; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5pt; color: var(--muted); }
td { padding: 6pt 8pt; border-bottom: 1px solid var(--line); vertical-align: top; }
tr { page-break-inside: avoid; }

figure { margin: 12pt 0 16pt; page-break-inside: avoid; }
figure img { width: 100%; border: 1px solid var(--line); border-radius: 6px; display: block; }
figcaption { font-size: 8.5pt; color: var(--subtle); margin-top: 5pt; font-style: italic; }
.note { font-size: 9.5pt; color: var(--muted); margin: -8pt 0 14pt; }

.cover { min-height: 240mm; display: flex; flex-direction: column; }
.cover-mark { width: 46mm; margin-bottom: 18mm; }
.cover-meta { margin-top: auto; border-top: 2px solid var(--ink); padding-top: 10pt; font-size: 9.5pt; }
.cover-meta dl { display: grid; grid-template-columns: 34mm 1fr; gap: 4pt 0; margin: 0; }
.cover-meta dt { color: var(--subtle); }
.cover-meta dd { margin: 0; }

.callout { background: var(--accent-soft); border-left: 3px solid var(--accent); padding: 9pt 12pt; margin: 12pt 0; font-size: 9.5pt; page-break-inside: avoid; }
.callout strong { color: var(--accent); }
.callout.warn { background: #fdf4e6; border-left-color: var(--warn); }
.callout.warn strong { color: var(--warn); }

.diagram { font-family: 'Cascadia Mono', Consolas, monospace; font-size: 8pt; line-height: 1.45; background: #f7f9fc; border: 1px solid var(--line); border-radius: 6px; padding: 12pt; white-space: pre; overflow-x: auto; margin: 10pt 0 14pt; page-break-inside: avoid; }

.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10pt; }
.card { border: 1px solid var(--line); border-radius: 6px; padding: 10pt 12pt; page-break-inside: avoid; }
.card h5 { margin: 0 0 4pt; font-size: 10pt; }
.card p { margin: 0; font-size: 9pt; color: var(--muted); }

.pill { display: inline-block; font-size: 8pt; font-weight: 700; padding: 2px 7px; border-radius: 99px; }
.pill.admin { background: var(--accent-soft); color: var(--accent); }
.pill.pm { background: #e9f3fb; color: #1a6099; }
.pill.dev { background: #e7f5ef; color: var(--success); }
.pill.no { background: #fdeef0; color: var(--danger); }

.stepflow { counter-reset: step; margin: 12pt 0 16pt; padding: 0; list-style: none; }
.stepflow li { counter-increment: step; position: relative; padding-left: 26pt; margin-bottom: 9pt; }
.stepflow li::before {
  content: counter(step); position: absolute; left: 0; top: 0;
  width: 17pt; height: 17pt; border-radius: 99px; background: var(--ink); color: #fff;
  font-size: 8.5pt; font-weight: 700; display: flex; align-items: center; justify-content: center;
}

@media print {
  body { background: #fff; font-size: 10pt; }
  .page { padding: 0; max-width: none; }
  a { color: var(--ink); }
  @page { size: A4; margin: 14mm 13mm; }
}
"""


def build():
    logo = base64.b64encode((ROOT.parent / 'web' / 'public' / 'velozity-logo.png').read_bytes()).decode()

    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Velozity Project Dashboard — Submission</title>
<style>{CSS}</style>
</head>
<body>
<div class="page">

<!-- ======================= COVER ======================= -->
<section class="cover first">
  <img class="cover-mark" src="data:image/png;base64,{logo}" alt="Velozity Global Solutions" />
  <p class="eyebrow">Technical Hiring Assessment · Full Stack Developer</p>
  <h1>Velozity Project Dashboard</h1>
  <p class="lede">A real-time client project dashboard with role-based access and a live activity
  feed. Three roles with strictly different permissions, enforced at the API; WebSocket updates
  filtered per role; and a scheduled job that flags overdue work.</p>

  <div class="callout">
    <strong>Try it in two clicks.</strong> Open the live application and use any account from the
    table in section 3 — the password is <code>Password123!</code> for all of them. The sign-in page
    also lists three of them; clicking one fills the form in.
  </div>

  <div class="cover-meta">
    <dl>
      <dt>Live application</dt><dd><a href="{LIVE}">{LIVE}</a></dd>
      <dt>API</dt><dd><a href="{API}">{API}</a></dd>
      <dt>Repository</dt><dd><a href="{REPO}">{REPO}</a></dd>
      <dt>Stack</dt><dd>React 19 · TypeScript · Node + Express · PostgreSQL · Prisma · Socket.io · Docker</dd>
      <dt>Hosting</dt><dd>Vercel (web) · Render (API) · Neon (PostgreSQL)</dd>
    </dl>
  </div>
</section>

<!-- ======================= WHAT IT IS ======================= -->
<section>
  <h2>1 · What this application does</h2>
  <p class="section-intro">An internal tool a small agency uses to manage client projects, move
  work through review, and watch team activity as it happens.</p>

  <p>Three kinds of people use it, and each effectively gets a different application:</p>

  <div class="grid2">
    <div class="card">
      <h5>Admin <span class="pill admin">full access</span></h5>
      <p>Manages clients, projects and user accounts. Sees every project, a global activity feed,
      and a live count of who is online right now.</p>
    </div>
    <div class="card">
      <h5>Project Manager <span class="pill pm">own projects</span></h5>
      <p>Creates and runs their own projects, assigns developers to them, creates and assigns
      tasks. Cannot see another manager's work at all.</p>
    </div>
  </div>
  <div class="grid2" style="margin-top:10pt">
    <div class="card">
      <h5>Developer <span class="pill dev">own tasks</span></h5>
      <p>Sees only the tasks assigned to them, and can move those through the workflow. Never
      receives another developer's activity.</p>
    </div>
    <div class="card">
      <h5>The system itself <span class="pill no">automatic</span></h5>
      <p>A scheduled job flags work that has passed its due date, posts it to the feed as
      <em>System</em>, and notifies whoever the task belongs to.</p>
    </div>
  </div>

  <h3>What a task carries</h3>
  <p>Every task has a title, description, an assigned developer, a status
  (<strong>To&nbsp;Do → In&nbsp;Progress → In&nbsp;Review → Done</strong>), a priority
  (<strong>Low, Medium, High, Critical</strong>), a due date, and a complete activity history.
  Each task also has a short human number — <code>#12</code> — so people can refer to it out loud
  without quoting a UUID.</p>

  <h3>The rule that shapes everything</h3>
  <p>Permission is not a check bolted onto a query — it <em>is</em> the query. Every list is built
  from a role scope compiled into its <code>WHERE</code> clause, so a developer's request is
  structurally incapable of returning another developer's task. There is no fetch-then-filter step
  that somebody could forget to write.</p>
</section>

<!-- ======================= ARCHITECTURE ======================= -->
<section>
  <h2>2 · Architecture</h2>
  <p class="section-intro">Three deployed pieces, and one rule about how a request becomes data.</p>

<div class="diagram">   Vercel                    Render                       Neon
   ──────                    ──────                       ────
   React + TypeScript  ───►  Node + Express  ──────────►  PostgreSQL
   (static build)            (Docker, WebSocket)          (managed)

                               ▲        │
                               │        └──►  node-cron sweep
                               │              flags overdue work
                               └──────────────  Socket.io rooms
                                                live feed · presence</div>

  <h3>How a request becomes data</h3>
<div class="diagram">   HTTP request
        │
        ▼
   verify JWT signature          ← a modified token fails here
        │
        ▼
   load the user from PostgreSQL ← the role comes from the database,
        │                          never from the token's claim
        ▼
   requireRole(...) on the route
        │
        ▼
   validate body / query / params with Zod
        │
        ▼
   role scope compiled into the SQL WHERE clause
        │
        ├──►  PostgreSQL   read or write, plus an append-only activity row
        │                  written inside the same transaction
        ▼
   broadcast over Socket.io — only after the transaction commits</div>

  <h3>Why the live feed is filtered by room membership</h3>
  <p>The obvious approach — broadcast a project's events to everyone watching that project — leaks
  one developer's work to another. So membership of a room <em>is</em> the authorisation:</p>
  <ul>
    <li><strong>Admins</strong> join a global room automatically on connect.</li>
    <li><strong>Project managers</strong> join a project room only through an explicit subscribe
    that the server authorises against the database, and acknowledges.</li>
    <li><strong>Developers</strong> are refused project rooms entirely and receive events on their
    own personal channel — so no path exists by which another developer's task reaches them.</li>
  </ul>
  <p>One status change fans out as a single chained emit across the global, project, manager and
  assignee rooms, which Socket.io de-duplicates, so nobody receives it twice.</p>

  <h3>Authentication</h3>
  <table>
    <tr><th>Access token</th><th>Refresh token</th></tr>
    <tr>
      <td>15 minutes · held in memory in React · never written to localStorage</td>
      <td>7 days · <code>HttpOnly</code> cookie scoped to <code>/api/auth</code> · stored server-side as a SHA-256 hash</td>
    </tr>
  </table>
  <p>Every refresh rotates the cookie. Presenting an already-used token revokes the entire token
  family and refuses — so a stolen cookie is good for exactly one use, and that use logs both
  parties out and leaves a trail.</p>
</section>

<!-- ======================= ACCOUNTS ======================= -->
<section>
  <h2>3 · Demo accounts</h2>
  <p class="section-intro">Seven seeded accounts. The password is the same for all of them.</p>

  <div class="callout">
    <strong>Password for every account:</strong> <code>Password123!</code>
  </div>

  <table>
    <thead><tr><th>Email</th><th>Role</th><th>What they can reach</th></tr></thead>
    <tbody>
      <tr><td><code>admin@velozity.test</code></td><td><span class="pill admin">Admin</span></td><td>Everything — clients, projects, users, global activity feed, live online count</td></tr>
      <tr><td><code>ravi@velozity.test</code></td><td><span class="pill pm">Project Manager</span></td><td>Northwind Storefront Revamp, Lumen Patient Portal</td></tr>
      <tr><td><code>neha@velozity.test</code></td><td><span class="pill pm">Project Manager</span></td><td>Kanto Fleet Tracker, Northwind Loyalty Programme</td></tr>
      <tr><td><code>karan@velozity.test</code></td><td><span class="pill dev">Developer</span></td><td>Their 6 assigned tasks only</td></tr>
      <tr><td><code>sana@velozity.test</code></td><td><span class="pill dev">Developer</span></td><td>Their assigned tasks only</td></tr>
      <tr><td><code>dev@velozity.test</code></td><td><span class="pill dev">Developer</span></td><td>Their assigned tasks only</td></tr>
      <tr><td><code>meera@velozity.test</code></td><td><span class="pill dev">Developer</span></td><td>Their assigned tasks only</td></tr>
    </tbody>
  </table>

  <h3>What the seed data contains</h3>
  <p>3 clients · 4 projects (each with 5 or more tasks) · 21 tasks spanning every status and every
  priority · 2 already flagged overdue · 67 activity rows with staggered timestamps · 29
  notifications. The feed and the unread badges are populated on first load rather than empty.</p>

  <div class="callout warn">
    <strong>First load may take up to a minute.</strong> The API runs on a free Render instance
    that sleeps after 15 minutes of inactivity, so the very first request has to wake it.
    Everything is instant afterwards.
  </div>

  <h3>Seeing the real-time behaviour</h3>
  <p>Open two windows as different people — one normal window and one Incognito window, since two
  tabs in the same browser share a session. Sign in as <code>karan@velozity.test</code> in one and
  <code>admin@velozity.test</code> in the other, then change a task's status as Karan. The admin's
  feed gains the row immediately, with no refresh. Add a third window as
  <code>sana@velozity.test</code> and they receive nothing — the task is not theirs.</p>
</section>

<!-- ======================= WALKTHROUGH: LANDING ======================= -->
<section>
  <h2>4 · Walkthrough — arriving</h2>
  <p class="section-intro">What a visitor sees before signing in.</p>

  {figure('01-landing-hero', 'The landing page. The counters below the fold state what the build actually does — three separate roles, no polling in the client, and up to twenty missed events replayed when somebody returns.')}

  <p>The landing page explains the product rather than the assessment, and makes the access model
  explicit: this is an internal tool, so accounts are created by an administrator rather than
  signed up for.</p>

  {figure('02-landing-roles', 'The three roles side by side, each with a button that signs you straight in as that role — so a reviewer never has to copy a credential to look around.')}
</section>

<!-- ======================= WALKTHROUGH: SIGN IN ======================= -->
<section>
  <h2>5 · Walkthrough — signing in</h2>

  {figure('03-login-admin', 'Signing in as the administrator. The demo accounts are listed beneath the form and clicking one fills it in.')}

  <p>On success the API returns a short-lived access token in the response body and sets the
  refresh token as an <code>HttpOnly</code> cookie. The access token is kept in memory only — you
  will find nothing in <code>localStorage</code>. Reloading the page restores the session from the
  cookie, which is the quickest way to confirm the whole chain works: Vercel origin → Render API →
  Neon database.</p>

  <div class="callout">
    <strong>There is no sign-up page, deliberately.</strong> A public form where you choose your own
    role would be privilege escalation by design — anyone could grant themselves Project Manager.
    Accounts are created by an admin on the Team page, which is the model the brief describes.
  </div>
</section>

<!-- ======================= ADMIN ======================= -->
<section>
  <h2>6 · The Admin workspace</h2>
  <p class="section-intro">Full access across the agency: clients, projects, people and every
  activity event.</p>

  <h3>Overview</h3>
  {figure('04-admin-overview', 'The admin dashboard: totals across every project, the overdue count flagged by the scheduler, and a live count of who is connected right now.')}

  <p>The four figures at the top answer the questions an owner asks first. <strong>Overdue</strong>
  is produced by the background job rather than calculated when the page loads, and
  <strong>Online now</strong> comes from WebSocket presence — open a second window as another user
  and the number changes without a refresh.</p>

  <h3>Projects</h3>
  {figure('05-admin-projects', 'Every client project, each showing its client, its manager, a per-status breakdown and an overdue count that links straight to the filtered task list.')}

  <p>An admin sees all four projects here. A project manager opening the same page sees only their
  own — same endpoint, different data, decided on the server.</p>

  <h3>Clients</h3>
  {figure('06-admin-clients', 'Clients, with the number of projects each one has. A client cannot be removed while projects still reference it.')}

  <p><strong>Add client</strong> captures a name, company and contact email. Every project belongs
  to a client, so deleting one that still has projects is refused with a clear conflict rather than
  cascading silently.</p>

  <h3>Team — creating accounts</h3>
  {figure('07-admin-team', 'The team page. Each person can have their role changed or be deactivated, and their presence is shown live.')}

  <p>This is where every account originates. <strong>Add member</strong> takes a name, email, role
  (Developer, Project Manager or Admin) and a temporary password. The new person can sign in
  immediately.</p>
  <p>Changing somebody's role or deactivating them does two things at once: it revokes their
  refresh tokens, and it disconnects their open WebSocket connections. An HTTP request re-reads the
  role from the database every time, but a socket was authorised when it connected — so dropping it
  forces a fresh handshake rather than leaving stale permissions alive.</p>

  <h3>Tasks and filters</h3>
  {figure('08-admin-tasks', 'The task list with its filters. Status, priority, due-date range and overdue-only are all stored in the URL, so any filtered view can be shared as a link.')}

  <p>Filters live in the query string — <code>?status=TODO,IN_REVIEW&amp;priority=CRITICAL</code> —
  so the view is shareable, and <strong>Copy filter link</strong> puts it on the clipboard. The list
  and board views are the same data in two shapes. Status can be changed inline from the dropdown
  on each row.</p>

  <h3>Global activity feed</h3>
  {figure('09-admin-activity', 'The global feed. Rows written by the scheduler are attributed to System; everything else names the person who made the change.')}

  <p>Each row is a stored record, not something reconstructed from the task's current state. The
  wording is composed when the event happens — <em>"Karan Patel moved Task #19 from To Do → In
  Progress"</em> — so the live WebSocket event and a later page load read identically. The client
  only adds the relative timestamp.</p>
</section>

<!-- ======================= PM ======================= -->
<section>
  <h2>7 · The Project Manager workspace</h2>
  <p class="section-intro">The same application, narrowed to the projects this person owns.</p>

  {figure('10-pm-overview', 'Ravi&#8217;s dashboard. Two projects, eleven tasks, and work due in the next seven days — all limited to the projects they manage.')}

  <p>Compare this with the admin overview: the layout is the same, the numbers are not. Ravi sees
  <strong>2 projects and 11 tasks</strong> where the admin saw <strong>4 and 21</strong>. That
  difference is produced by the API, not by hiding anything in the interface.</p>

  {figure('11-pm-projects', 'The projects page for a manager. The subtitle states the boundary plainly: another manager&#8217;s work is not visible here.')}

  <h3>What a project manager can do</h3>
  <ul>
    <li><strong>Create a project</strong> and assign it to a client.</li>
    <li><strong>Set its status</strong> — Active, On Hold or Completed — from the project page.</li>
    <li><strong>Staff it</strong>: add developers to the team from the panel on the project page.
    One developer can be added by several managers, so the same person can work across projects
    owned by different people.</li>
    <li><strong>Create and assign tasks</strong>, set priority and due dates, and edit any field.</li>
    <li><strong>Delete their own project</strong>, with a confirmation naming its task count.</li>
  </ul>
  <p>Every one of those is scoped to projects they own. Attempting any of them against another
  manager's project returns <code>403</code> — including subtler routes like filtering the project
  list by another manager's id.</p>

  <h3>What a manager is told about</h3>
  <p>When a developer moves one of their tasks into <strong>In Review</strong>, the owning manager
  receives a notification immediately — the unread badge increments over the WebSocket, with no
  polling anywhere in the client.</p>
</section>

<!-- ======================= DEVELOPER ======================= -->
<section>
  <h2>8 · The Developer workspace</h2>
  <p class="section-intro">The narrowest view: only the work assigned to this person.</p>

  {figure('13-login-developer', 'Signing in as a developer.')}

  {figure('12-developer-overview', 'Karan&#8217;s dashboard. Six tasks, sorted highest priority first and then by earliest due date — the ordering is done by the database, not in the browser.')}

  <p>The sidebar reads <strong>My Tasks</strong> rather than Tasks, and the Clients and Team
  sections are absent — but that is presentation. Typing <code>/users</code> into the address bar
  gets nothing back, because the API refuses it regardless of what the interface shows.</p>

  {figure('14-developer-tasks', 'The same task list a manager sees, returning six tasks instead of twenty-one. Every one is assigned to Karan.')}

  <h3>What a developer can and cannot do</h3>
  <table>
    <thead><tr><th>Action</th><th>Result</th></tr></thead>
    <tbody>
      <tr><td>Change the status of their own task</td><td><span class="pill dev">allowed</span></td></tr>
      <tr><td>Change the title, priority, due date or assignee of their own task</td><td><span class="pill no">403</span> — the error names the field that was rejected</td></tr>
      <tr><td>Read or move another developer's task</td><td><span class="pill no">403</span></td></tr>
      <tr><td>Request another developer's tasks via <code>?assigneeId=…</code></td><td><span class="pill no">403</span></td></tr>
      <tr><td>Create or delete a task, or create a project</td><td><span class="pill no">403</span></td></tr>
      <tr><td>List users or clients</td><td><span class="pill no">403</span></td></tr>
    </tbody>
  </table>

  {figure('15-developer-activity', 'The developer&#8217;s activity feed. Every row concerns a task assigned to Karan — events on other developers&#8217; work never reach this feed, live or on reload.')}

  <p>This is the same feed component the admin uses; only the scope differs. A developer's feed is
  filtered on who owned the task <em>at the moment of the event</em>, not on who owns it now — so
  reassigning a task never hands its history to somebody new.</p>
</section>

<!-- ======================= FEATURES ======================= -->
<section>
  <h2>9 · Features in detail</h2>

  <h3>Creating work: the full path</h3>
  <ol class="stepflow">
    <li><strong>Admin adds a client</strong> — name, company, contact email.</li>
    <li><strong>Admin or a manager creates a project</strong> against that client. A manager's
    project is always assigned to themselves; only an admin can hand a project to someone else.</li>
    <li><strong>Admin creates the accounts</strong> people need, choosing Developer, Project Manager
    or Admin.</li>
    <li><strong>The owning manager staffs the project</strong>, adding developers to its team. This
    is separate from creating the account on purpose: the admin decides <em>what someone is</em>,
    the manager decides <em>who works on what</em>.</li>
    <li><strong>The manager creates tasks</strong> with a title, description, priority, due date and
    an assigned developer. Assigning one notifies that developer instantly.</li>
    <li><strong>The developer moves the task</strong> through In Progress and into In Review. The
    manager is notified the moment it lands in review.</li>
    <li><strong>Everyone entitled to see it</strong> gets the event live, and the change is written
    to the task's permanent history.</li>
  </ol>

  <h3>Overdue detection</h3>
  <p>A background job runs on a schedule — every five minutes in production — and finds tasks past
  their due date that are not finished. For each it sets the overdue flag with a timestamp, writes
  an activity row attributed to <strong>System</strong>, and notifies the assignee.</p>
  <p>The API itself never raises that flag, not even when you create a task with a due date already
  in the past. That keeps the responsibility in exactly one place, which is what the brief asks for:
  flagged by a scheduled job, not computed when a page loads. The sweep is idempotent, so a repeat
  run flags nothing twice, and it also runs once at start-up to catch up anything missed while the
  service was restarting.</p>

  <h3>Notifications</h3>
  <ul>
    <li>A developer is notified when a task is <strong>assigned</strong> to them.</li>
    <li>A manager is notified when one of their tasks moves to <strong>In Review</strong>.</li>
    <li>An assignee is notified when their task is <strong>flagged overdue</strong>.</li>
  </ul>
  <p>Notifications are stored in PostgreSQL, shown as a count badge that expands into a dropdown,
  and can be marked read individually or all at once. The unread count updates over the WebSocket —
  there is no polling interval anywhere in the client.</p>

  <h3>Coming back after being away</h3>
  <p>When a user's last connection drops, the server records when they were last seen. On their
  return, the feed shows a banner listing up to twenty events they missed, read back out of the
  database rather than from any in-memory cache, and filtered to what that person is allowed to
  see.</p>

  <h3>Presence</h3>
  <p>Connections are tracked per user, so somebody with three tabs open counts once and only goes
  offline when their last tab closes. The admin's "online now" figure and the green dots on the team
  page come from that.</p>

  <h3>Interface</h3>
  <p>Light and dark themes follow the operating system by default and can be toggled, with the
  choice remembered. Every colour pair in the interface meets the WCAG AA contrast minimum, checked
  by a script that runs in CI. The layout works down to phone width, and motion is deliberately
  restrained — short fades, nothing that moves more than a few pixels, and all of it disabled for
  anyone who has asked their system to reduce motion.</p>
</section>

<!-- ======================= RBAC ======================= -->
<section>
  <h2>10 · Permissions at a glance</h2>
  <p class="section-intro">Every one of these is enforced by the API. The interface mirrors it for
  convenience, but hiding a button is never the protection.</p>

  <table>
    <thead><tr><th>Capability</th><th>Admin</th><th>Project Manager</th><th>Developer</th></tr></thead>
    <tbody>
      <tr><td>User accounts and roles</td><td>Create, edit, deactivate</td><td>List only</td><td>—</td></tr>
      <tr><td>Clients</td><td>Full</td><td>List only</td><td>—</td></tr>
      <tr><td>Projects</td><td>All</td><td>Own only</td><td>Those they are on</td></tr>
      <tr><td>Project team</td><td>Any project</td><td>Own projects</td><td>—</td></tr>
      <tr><td>Tasks</td><td>All</td><td>Own projects</td><td>Assigned to them</td></tr>
      <tr><td>Task fields</td><td>Every field</td><td>Every field, own projects</td><td>Status only</td></tr>
      <tr><td>Activity feed</td><td>Global</td><td>Own projects</td><td>Own tasks</td></tr>
      <tr><td>Presence count</td><td>Yes</td><td>—</td><td>—</td></tr>
    </tbody>
  </table>

  <h3>Why a tampered token does not help</h3>
  <p>Editing a JWT breaks its signature, so it is rejected outright. But even a validly signed token
  will not do it: the middleware <em>ignores the role claim inside the token</em> and re-reads the
  role from the database on every single request. The token proves who you are; the database decides
  what you are. Demoting somebody therefore takes effect on their next request rather than whenever
  their token happens to expire.</p>

  <h3>Filters cannot widen a scope</h3>
  <p>The role scope and the caller's filters are combined with <code>AND</code> rather than merged
  into one object, so a filter can only ever narrow a result set. A developer adding
  <code>?assigneeId=&lt;somebody else&gt;</code> is refused outright rather than being handed a
  silently empty list.</p>
</section>

<!-- ======================= ENGINEERING ======================= -->
<section>
  <h2>11 · Engineering notes</h2>

  <h3>Database</h3>
  <p>Eight tables in PostgreSQL with real foreign keys and enums: users, refresh tokens, clients,
  projects, project members, tasks, activity logs and notifications.</p>
  <p>The activity log is append-only and written inside the same transaction as the change it
  describes. Three fields are denormalised on purpose: the actor's name and the task's title and
  number, so the feed renders without joins and history stays truthful after a rename; and
  <strong>the assignee at the time of the event</strong>, which is what makes a developer's feed
  both correct and a single indexed lookup.</p>
  <p>Each feed variant has a composite index whose leading column is that role's filter and whose
  second column is the sort order, so every feed read is an index scan rather than a scan and sort.</p>

  <h3>Testing</h3>
  <table>
    <thead><tr><th>Suite</th><th>Checks</th><th>What it covers</th></tr></thead>
    <tbody>
      <tr><td><code>npm run smoke</code></td><td>117</td><td>Role scoping, realtime fan-out, tokens, validation, error shapes</td></tr>
      <tr><td><code>npm run attack</code></td><td>24</td><td>Adversarial: tries to break each boundary from outside</td></tr>
      <tr><td><code>npm run verify:overdue</code></td><td>7</td><td>The scheduler, including that a second sweep is a no-op</td></tr>
      <tr><td><code>npm test</code> (web)</td><td>16</td><td>Client cache scoping, query keys, and tab titles</td></tr>
    </tbody>
  </table>
  <p>The adversarial suite was run against the deployed API, not only locally: all 24 passed,
  including WebSocket isolation over TLS — the admin, the assignee and the owning manager all
  received a status change while an unrelated developer received nothing.</p>
  <p>GitHub Actions runs every suite on each push: both TypeScript projects typecheck, migrations
  apply to a clean database, the compiled server boots and the full suite runs against it, and both
  Docker images build.</p>

  <h3>Running it locally</h3>
  <p>One command brings up the database, API and web client together, applies migrations and seeds
  the demo data:</p>
  <div class="diagram">git clone {REPO}
cd velozity-project-dashboard
cp .env.example .env          # then add two long random JWT secrets
docker compose up -d          # http://localhost:5173 · cold start ≈ 20 seconds</div>

  <h3>Known limitations</h3>
  <ul>
    <li>The scheduler and the presence map are in-process, which suits a single instance and would
    need a shared store (Redis) behind more than one.</li>
    <li>Catch-up granularity is one timestamp per user, so somebody with two tabs open does not
    advance it by closing one.</li>
    <li>The free Render instance sleeps after 15 minutes, which pauses the scheduler; the sweep runs
    again at start-up, so waking it catches up anything missed.</li>
    <li>A new user is not emailed their credentials — an admin sets a temporary password and passes
    it on.</li>
  </ul>
  <p>The repository README carries the full schema description, the indexing rationale, the
  reasoning behind each architectural choice, and the complete API reference.</p>
</section>

</div>
</body>
</html>
"""

    OUT.write_text(html, encoding='utf-8')
    size = OUT.stat().st_size / 1024 / 1024
    print(f'built {OUT.name} — {size:.1f} MB, {len(list(SHOTS.glob("*.png")))} screenshots embedded')


if __name__ == '__main__':
    build()
