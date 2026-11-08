import type { Legend, Point } from '../game/game';
import cave from './cave.txt?raw';
import dojo from './dojo.txt?raw';
import elderHouse from './elder-house.txt?raw';
import home from './home.txt?raw';
import inn from './inn.txt?raw';
import lesson1 from './lesson-1.txt?raw';
import lesson2 from './lesson-2.txt?raw';
import lesson3 from './lesson-3.txt?raw';
import lesson4 from './lesson-4.txt?raw';
import shop from './shop.txt?raw';
import village from './village.txt?raw';
import wood from './wood.txt?raw';

export type Area = Legend & { name: string; map: string; bedside?: Point; lesson?: boolean };

const indoors = { floor: 'wood', exits: { '<': { to: 'village', look: 'mat' } } } as const;
// A dojo lesson has no way out: you start on its @ and leave by winning it.
const lesson = (map: string) => ({ name: 'Dojo', map, exits: {}, lesson: true });

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
      6: { to: 'dojo', look: 'door' },
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
        quest: {
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
        introLines: [
          'Morning, sleepyhead.',
          'Doctor Madeleine sent word. She wants you at her dojo.',
        ],
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
        quest: {
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
        quest: {
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
  dojo: {
    name: 'Dojo',
    map: dojo,
    ...indoors,
    people: {
      d: {
        name: 'Doctor Madeleine',
        colors: { hair: '#3a2a26', shirt: '#e2dccb' },
        lines: [
          'There you are. I am Doctor Madeleine, doctor of fighting.',
          'Three goblin chiefs are attacking the village.',
        ],
        training: {
          question: 'Will you help me save it?',
          accepted: ['Good. Then you will need a sword.'],
          declined: ['Then go home. Come back if you change your mind.'],
          lessons: [
            {
              area: 'lesson-1',
              lines: [
                'One monster hides in this grass.',
                'The number tells you the total power of monsters next to a tile.',
                'With your sword you are level 1. You can defeat anything of level 1 or below.',
                'Go kill it to proceed.',
              ],
            },
            {
              area: 'lesson-2',
              lines: [
                'In this next scenario, there are two monsters.',
                'Where both are next to a tile, its number adds them up.',
              ],
            },
            {
              area: 'lesson-3',
              lines: [
                'Now there are three.',
                'A blank tile has no monsters next to it, and opens up the ground around it.',
                'Defeating a monster lowers the numbers around it.',
              ],
            },
            {
              area: 'lesson-4',
              lines: [
                'This time a bat hides among the slimes.',
                'A bat is level 2. Step on it and it will hurt you.',
                'Next to a 1, nothing can be stronger than you.',
                'Defeat the slimes and leave the bat alone.',
              ],
            },
          ],
          after: ['You can collect whetstones to grow in power.'],
        },
      },
    },
  },
  'lesson-1': lesson(lesson1),
  'lesson-2': lesson(lesson2),
  'lesson-3': lesson(lesson3),
  'lesson-4': lesson(lesson4),
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
