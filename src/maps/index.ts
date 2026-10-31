// Generated clearings, played in file-name order.
const files = import.meta.glob<string>('./clearing-*.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
});
export const maps = Object.keys(files)
  .sort()
  .map((path) => files[path]);
