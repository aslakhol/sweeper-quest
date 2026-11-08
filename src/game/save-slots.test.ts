import { describe, expect, it } from 'vitest';
import { serialize } from './save';
import { SaveSlots } from './save-slots';
import { createWorld, travel } from './world';

function storage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe('save slots', () => {
  it('copies the legacy save exactly once and keeps its original backup', () => {
    const store = storage();
    const original = createWorld();
    original.game.hero.health = 1;
    travel(original, 'wood');
    const text = serialize(original);
    store.setItem('sweeper-quest-save', text);
    const slots = new SaveSlots(store);
    expect(slots.read(1)).toMatchObject({ status: 'ready', text });
    expect(slots.open(1)?.area).toBe('wood');
    slots.replace(1, createWorld());
    expect(new SaveSlots(store).read(1)).toMatchObject({
      status: 'ready',
      world: { area: 'village' },
    });
    expect(store.getItem('sweeper-quest-save')).toBe(text);
    expect(slots.read(2).status).toBe('empty');
    expect(slots.read(3).status).toBe('empty');
  });

  it('saves each world independently and remembers the last selected slot', () => {
    const store = storage();
    const slots = new SaveSlots(store);
    const first = slots.open(1);
    const second = slots.open(2);
    if (!first || !second) throw new Error('Empty slots should start a game.');
    second.game.hero.power = 3;
    travel(second, 'cave');
    slots.save(second);
    const third = slots.open(3);
    if (!third) throw new Error('Empty slot should start a game.');
    third.game.hero.coins = 4;
    slots.save(third);
    expect(slots.read(1)).toMatchObject({ text: serialize(first) });
    expect(slots.read(2)).toMatchObject({ text: serialize(second) });
    const reloaded = new SaveSlots(store);
    expect(reloaded.selected).toBe(3);
    expect(reloaded.open(reloaded.selected)?.game.hero.coins).toBe(4);
  });

  it('keeps an incompatible selected save through autosaves, reloads and playing another slot', () => {
    const store = storage();
    const text = '{"version":0,"someOldProgress":"keep me"}';
    store.setItem('sweeper-quest-save', text);
    const slots = new SaveSlots(store);
    expect(slots.open(slots.selected)).toBeUndefined();
    slots.save(createWorld());
    const reloaded = new SaveSlots(store);
    expect(reloaded.read(1)).toEqual({ status: 'incompatible', text });
    reloaded.open(2);
    expect(reloaded.open(1)).toBeUndefined();
    expect(reloaded.active).toBe(2);
    reloaded.save(createWorld());
    expect(reloaded.read(1)).toEqual({ status: 'incompatible', text });
    reloaded.replace(1, createWorld());
    expect(reloaded.read(1).status).toBe('ready');
    expect(reloaded.active).toBe(1);
  });
});
