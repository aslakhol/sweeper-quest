export { default as village } from './village.txt?raw';

// Generated dungeon floors; each trip down picks one.
const files = import.meta.glob<string>('./dungeon-*.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
});
export const dungeons = Object.keys(files)
  .sort()
  .map((path) => files[path]);
