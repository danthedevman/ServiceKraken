import { useResource } from '../../data/use-resource.js';

/** Load workspace organization, keeping failed refreshes visible and editable forms intact. */
export function useCatalog({ includeMonitors = true } = {}) {
  const services = useResource('/services');
  const collections = useResource('/collections');
  const monitors = useResource(includeMonitors ? '/monitors' : null);
  const members = useResource('/members');
  const groups = useResource('/groups');
  return {
    data:
      services.data &&
      collections.data &&
      (!includeMonitors || monitors.data) &&
      members.data &&
      groups.data
        ? {
            ...services.data,
            ...collections.data,
            ...monitors.data,
            ...members.data,
            ...groups.data,
          }
        : null,
    error: services.error || collections.error || monitors.error || members.error || groups.error,
    refresh: () =>
      Promise.all([
        services.refresh(),
        collections.refresh(),
        monitors.refresh(),
        members.refresh(),
        groups.refresh(),
      ]),
  };
}
