export { default as village } from './village.txt?raw';

// Generated clearings, kept as a bank for testing rule and balance changes.
const files = import.meta.glob<string>('./clearing-*.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
});
export const clearings = Object.keys(files)
  .sort()
  .map((path) => files[path]);
