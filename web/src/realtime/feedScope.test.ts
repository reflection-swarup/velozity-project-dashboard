import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { activityKeys } from '../hooks/keys';
import { feedAcceptsActivity, prependActivityToFeeds } from './feedScope';
import type { Activity } from '../types';

const PROJECT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PROJECT_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const activity = (id: string, projectId: string): Activity => ({
  id,
  type: 'TASK_STATUS_CHANGED',
  projectId,
  projectName: 'Project',
  taskId: 'task-' + id,
  taskNumber: 42,
  taskTitle: 'A task',
  actorId: 'actor',
  actorName: 'Ravi Menon',
  fromStatus: 'IN_PROGRESS',
  toStatus: 'IN_REVIEW',
  message: 'Ravi Menon moved Task #42 from In Progress → In Review',
  createdAt: new Date().toISOString(),
});

const seedFeed = (client: QueryClient, scope: string, items: Activity[]) => {
  client.setQueryData(activityKeys.feed(scope === 'all' ? undefined : scope), {
    pages: [{ items, nextCursor: null }],
    pageParams: [undefined],
  });
};

const itemsIn = (client: QueryClient, scope: string) => {
  const data = client.getQueryData<{ pages: { items: Activity[] }[] }>(
    activityKeys.feed(scope === 'all' ? undefined : scope),
  );
  return data?.pages.flatMap((page) => page.items) ?? [];
};

describe('feedAcceptsActivity', () => {
  it('accepts any project into the unfiltered feed', () => {
    expect(feedAcceptsActivity(activityKeys.feed(undefined), PROJECT_B)).toBe(true);
  });

  it('accepts an event into the feed for its own project', () => {
    expect(feedAcceptsActivity(activityKeys.feed(PROJECT_A), PROJECT_A)).toBe(true);
  });

  it('rejects an event from another project', () => {
    expect(feedAcceptsActivity(activityKeys.feed(PROJECT_A), PROJECT_B)).toBe(false);
  });
});

describe('prependActivityToFeeds', () => {
  it('does not leak a project B event into a feed filtered to project A', () => {
    const client = new QueryClient();
    seedFeed(client, 'all', []);
    seedFeed(client, PROJECT_A, []);

    prependActivityToFeeds(client, activity('event-1', PROJECT_B));

    expect(itemsIn(client, 'all').map((item) => item.id)).toEqual(['event-1']);
    expect(itemsIn(client, PROJECT_A)).toEqual([]);
  });

  it('delivers an event to both the global feed and its own project feed', () => {
    const client = new QueryClient();
    seedFeed(client, 'all', []);
    seedFeed(client, PROJECT_A, []);
    seedFeed(client, PROJECT_B, []);

    prependActivityToFeeds(client, activity('event-2', PROJECT_A));

    expect(itemsIn(client, 'all').map((item) => item.id)).toEqual(['event-2']);
    expect(itemsIn(client, PROJECT_A).map((item) => item.id)).toEqual(['event-2']);
    expect(itemsIn(client, PROJECT_B)).toEqual([]);
  });

  it('prepends newest first and never duplicates a redelivered event', () => {
    const client = new QueryClient();
    seedFeed(client, 'all', [activity('older', PROJECT_A)]);

    prependActivityToFeeds(client, activity('newer', PROJECT_A));
    prependActivityToFeeds(client, activity('newer', PROJECT_A));

    expect(itemsIn(client, 'all').map((item) => item.id)).toEqual(['newer', 'older']);
  });

  it('leaves the missed-events cache untouched', () => {
    const client = new QueryClient();
    client.setQueryData(activityKeys.missed, { since: 'then', items: [] });

    prependActivityToFeeds(client, activity('event-3', PROJECT_A));

    expect(client.getQueryData<{ items: Activity[] }>(activityKeys.missed)?.items).toEqual([]);
  });
});
