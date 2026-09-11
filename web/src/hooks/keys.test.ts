import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { taskKeys } from './keys';

const TASK = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const seed = (client: QueryClient) => {
  client.setQueryData(taskKeys.detail(TASK), { id: TASK, status: 'TODO' });
  client.setQueryData(taskKeys.activity(TASK), { items: [] });
  client.setQueryData(taskKeys.activity(OTHER), { items: [] });
  client.setQueryData(taskKeys.list('limit=100'), { items: [], total: 0 });
};

const invalidated = (client: QueryClient, key: readonly unknown[]) =>
  client.getQueryState(key)?.isInvalidated === true;

describe('task query keys', () => {
  it('writing the task detail does not refresh its history on its own', () => {
    const client = new QueryClient();
    seed(client);

    // What a status change used to do: patch the task in place. setQueryData is
    // an exact-key write, so nothing else is marked stale and the history card
    // kept showing the events from before the change.
    client.setQueryData(taskKeys.detail(TASK), { id: TASK, status: 'IN_REVIEW' });

    expect(invalidated(client, taskKeys.activity(TASK))).toBe(false);
  });

  it('invalidating the history refreshes only that task', () => {
    const client = new QueryClient();
    seed(client);

    client.invalidateQueries({ queryKey: taskKeys.activity(TASK) });

    expect(invalidated(client, taskKeys.activity(TASK))).toBe(true);
    expect(invalidated(client, taskKeys.activity(OTHER))).toBe(false);
  });

  it('invalidating the task lists leaves a task history alone', () => {
    const client = new QueryClient();
    seed(client);

    client.invalidateQueries({ queryKey: taskKeys.lists() });

    expect(invalidated(client, taskKeys.list('limit=100'))).toBe(true);
    expect(invalidated(client, taskKeys.activity(TASK))).toBe(false);
  });

  it('removing a deleted task takes its history with it', () => {
    const client = new QueryClient();
    seed(client);

    // detail is a prefix of activity, so one removal clears both.
    client.removeQueries({ queryKey: taskKeys.detail(TASK) });

    expect(client.getQueryData(taskKeys.detail(TASK))).toBeUndefined();
    expect(client.getQueryData(taskKeys.activity(TASK))).toBeUndefined();
    expect(client.getQueryData(taskKeys.activity(OTHER))).toBeDefined();
  });
});
