import { deserialize, serialize } from './save';
import { createWorld, type World } from './world';

export const saveSlots = [1, 2, 3] as const;
export type SaveSlot = (typeof saveSlots)[number];
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
const activeKey = 'sweeper-quest-active-save';
const slotKey = (slot: SaveSlot) => `sweeper-quest-save-${slot}`;

export class SaveSlots {
  active: SaveSlot | undefined;
  readonly selected: SaveSlot;
  private storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
    const selected = storage.getItem(activeKey);
    this.selected = saveSlots.find((slot) => String(slot) === selected) ?? 1;
    // Copy the old save verbatim, even if incompatible. Keep the original as a backup.
    if (selected === null && storage.getItem(slotKey(1)) === null) {
      const legacy = storage.getItem('sweeper-quest-save');
      if (legacy !== null) storage.setItem(slotKey(1), legacy);
    }
  }

  read(slot: SaveSlot) {
    const text = this.storage.getItem(slotKey(slot));
    if (text === null) return { status: 'empty' } as const;
    const world = deserialize(text);
    return world
      ? ({ status: 'ready', text, world } as const)
      : ({ status: 'incompatible', text } as const);
  }

  open(slot: SaveSlot): World | undefined {
    const saved = this.read(slot);
    if (saved.status === 'incompatible') return undefined;
    const world = saved.status === 'ready' ? saved.world : createWorld();
    this.storage.setItem(activeKey, String(slot));
    this.active = slot;
    if (saved.status === 'empty') this.save(world);
    return world;
  }

  replace(slot: SaveSlot, world: World): void {
    this.storage.setItem(slotKey(slot), serialize(world));
    this.storage.setItem(activeKey, String(slot));
    this.active = slot;
  }

  save(world: World): void {
    // An incompatible selected save has no active world and must never be autosaved over.
    if (this.active !== undefined) this.storage.setItem(slotKey(this.active), serialize(world));
  }
}
