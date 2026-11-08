import type { Legend, Point } from '../game/game';
import cave from './cave.txt?raw';
import elderHouse from './elder-house.txt?raw';
import home from './home.txt?raw';
import inn from './inn.txt?raw';
import shop from './shop.txt?raw';
import village from './village.txt?raw';
import wood from './wood.txt?raw';

export type Area = Legend & { name: string; map: string; bedside?: Point };

const indoors = { floor: 'wood', exits: { '<': { to: 'village', look: 'mat' } } } as const;

export const areas = {
  village: {
    name: 'Village',
    map: village,
    finds: { '?': 'ring' },
    exits: {
      1: { to: 'elder-house', look: 'door' },
      2: { to: 'home', look: 'door' },
      3: { to: 'inn', look: 'door' },
      4: { to: 'wood', look: 'gate' },
      5: { to: 'shop', look: 'door' },
      '>': { to: 'cave', look: 'stairs' },
    },
  },
  'elder-house': {
    name: "Elder's house",
    map: elderHouse,
    ...indoors,
    people: {
      e: {
        name: 'Elder Maren',
        colors: { hair: '#d8d4c8', shirt: '#5d6e8c' },
        lines: [
          'A visitor! Mind the tall grass west of the fence.',
          'The numbers out there add up the strength of the creatures around them.',
          'A slime counts one, a bat two, a goblin three.',
          'Their chief waits in the far corner, and you are no match for him yet.',
          'Whetstones lie out in the wild. Four would put a real edge on that sword.',
          'And if you go through the east gate, keep an eye out for my spectacles.',
        ],
        trade: {
          wants: 'spectacles',
          reward: 'whetstone',
          thanks: [
            'My spectacles! Now I can see who I am talking to.',
            'Take this whetstone. It is no use to me.',
          ],
          after: ['I can read again. The numbers out there are no easier, though.'],
        },
      },
    },
  },
  home: {
    name: 'Home',
    map: home,
    bedside: { x: 6, y: 2 },
    ...indoors,
    people: {
      m: {
        name: 'Mum',
        colors: { hair: '#8a5a3a', shirt: '#c08a9a' },
        heals: true,
        fullHealthLines: ['Not a scratch on you. Good.', 'Dinner will be ready when you need it.'],
        wakeLines: [
          'You are awake! They carried you back half dead.',
          'Be more careful out there. Please.',
        ],
        lines: [
          'There you are! Sit down, dinner is ready.',
          'Eat up. You need your strength out there.',
        ],
      },
    },
  },
  inn: {
    name: 'Inn',
    map: inn,
    ...indoors,
    people: {
      i: {
        name: 'Hilde',
        colors: { hair: '#b0603a', shirt: '#6a8a5a' },
        lines: [
          'Welcome to the inn.',
          'Bats and goblins crowd around whatever they are hiding.',
          'One of them made off with my ring out in the tall grass.',
          'If the numbers climb around an empty spot, look there.',
          'Bring my ring back and I will make it worth your while.',
        ],
        trade: {
          wants: 'ring',
          reward: 'heartPiece',
          thanks: [
            'My ring! I never thought I would see it again.',
            'Take this charm. My mother swore it kept her heart strong.',
          ],
          after: [
            'The ring stays on my finger now.',
            'There is more out there. Watch for numbers that climb around nothing.',
          ],
        },
      },
      p: {
        name: 'Pip',
        colors: { hair: '#e0c070', shirt: '#b05a5a' },
        lines: [
          'I went down the cave stairs once!',
          'There was a goblin with a crown. I ran straight back up.',
          'The stairs are right where you arrive. Just step on them again.',
          'I dropped my lucky marble down there. Can you get it back?',
        ],
        trade: {
          wants: 'marble',
          reward: 'whetstone',
          thanks: [
            'My marble! You went all the way down there?',
            'Here, swap you for this whetstone.',
          ],
          after: ['Did you see the crowned goblin? I am never going back.'],
        },
      },
    },
  },
  shop: {
    name: 'Shop',
    map: shop,
    ...indoors,
    wares: { w: { find: 'whetstone', price: 5 } },
    people: {
      k: {
        name: 'Bram',
        colors: { hair: '#3a3a3a', shirt: '#8a6a3a' },
        lines: [
          'Welcome! Whatever is on the counter is for sale.',
          'Folk drop coins all over out there.',
        ],
      },
    },
  },
  cave: {
    name: 'Cave',
    map: cave,
    floor: 'cave',
    finds: { '?': 'marble' },
    exits: { '<': { to: 'village', look: 'stairs' } },
  },
  wood: {
    name: 'Wood',
    map: wood,
    finds: { '?': 'spectacles' },
    exits: { '<': { to: 'village', look: 'gate' } },
  },
} satisfies Record<string, Area>;
