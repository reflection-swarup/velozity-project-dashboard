import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { activityKeys } from '../hooks/keys';
import type { Activity, Paginated } from '../types';

export const ALL_PROJECTS = 'all';

type FeedPages = InfiniteData<Paginated<Activity>> | undefined;

/**
 * A cached feed is keyed ['activity', 'feed', scope] where scope is either
 * 'all' or a project id. Query keys match by prefix, so without this check an
 * incoming event would be prepended into every cached feed, including one
 * filtered to a different project.
 */
export const feedAcceptsActivity = (queryKey: readonly unknown[], activityProjectId: string) => {
  const scope = queryKey[2];
  if (scope === undefined || scope === ALL_PROJECTS) return true;
  return scope === activityProjectId;
};

// The cache is walked instead of using setQueriesData because that updater is
// never told which key it is writing to, which is exactly what the scope
// decision needs.
export const prependActivityToFeeds = (queryClient: QueryClient, activity: Activity) => {
  const cached = queryClient.getQueryCache().findAll({ queryKey: activityKeys.all });

  for (const query of cached) {
    if (!feedAcceptsActivity(query.queryKey, activity.projectId)) continue;

    queryClient.setQueryData<FeedPages>(query.queryKey, (current) => {
      if (!current) return current;

      const alreadyThere = current.pages.some((page) =>
        page.items.some((item) => item.id === activity.id),
      );
      if (alreadyThere) return current;

      const [first, ...rest] = current.pages;
      if (!first) return current;

      return {
        ...current,
        pages: [{ ...first, items: [activity, ...first.items] }, ...rest],
      };
    });
  }
};
