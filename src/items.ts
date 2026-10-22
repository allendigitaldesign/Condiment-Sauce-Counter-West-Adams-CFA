/**
 * Everything the store counts.
 *
 * This list is written TWICE: here, and as `ITEMS` at the top of
 * `apps-script/Code.gs`. The ids must match exactly — the Sheet stores counts
 * by id, and an id the script doesn't know is silently dropped. If one
 * changes, change both, then run `npm test`, which compares them.
 *
 * The order here is the order on screen and the column order in the Sheet.
 */

export type Item = { id: string; label: string };

export type Category = {
  id: string;
  label: string;
  items: Item[];
};

export const CATEGORIES: Category[] = [
  {
    id: 'sauces',
    label: 'Sauces',
    items: [
      { id: 'cfa-sauce', label: 'CFA Sauce' },
      { id: 'ranch', label: 'Ranch' },
      { id: 'bbq', label: 'BBQ' },
      { id: 'polynesian', label: 'Polynesian' },
      { id: 'sriracha', label: 'Sriracha' },
      { id: 'honey-mustard', label: 'Honey Mustard' },
      { id: 'honey-roasted-bbq', label: 'Honey Roasted BBQ' },
      { id: 'syrup', label: 'Syrup' },
    ],
  },
  {
    id: 'dressings',
    label: 'Dressings',
    items: [
      { id: 'avocado-lime-ranch', label: 'Avocado Lime Ranch' },
      { id: 'garden-herb-ranch', label: 'Garden & Herb Ranch' },
      { id: 'ff-honey-mustard', label: 'FF Honey Mustard' },
      { id: 'light-balsamic', label: 'Light Balsamic' },
      { id: 'light-italian', label: 'Light Italian' },
      { id: 'zesty-apple-cider', label: 'Zesty Apple Cider' },
      { id: 'creamy-salsa', label: 'Creamy Salsa' },
    ],
  },
  {
    id: 'condiments',
    label: 'Condiments',
    items: [
      { id: 'ketchup', label: 'Ketchup' },
      { id: 'mayo', label: 'Mayo' },
      { id: 'mustard', label: 'Mustard' },
      { id: 'grape-jelly', label: 'Grape Jelly' },
      { id: 'strawberry-jelly', label: 'Strawberry Jelly' },
      { id: 'honey', label: 'Honey' },
      { id: 'texas-pete', label: 'Texas Pete' },
      { id: 'salsa', label: 'Salsa' },
      { id: 'salt', label: 'Salt' },
      { id: 'pepper', label: 'Pepper' },
    ],
  },
  {
    id: 'coffee',
    label: 'Coffee Condiments',
    items: [
      { id: 'half-and-half', label: 'Half & Half' },
      { id: 'french-vanilla', label: 'French Vanilla' },
      { id: 'sugar', label: 'Sugar' },
      { id: 'splenda', label: 'Splenda' },
    ],
  },
  {
    id: 'utensils',
    label: 'Utensils',
    items: [
      { id: 'forks', label: 'Forks' },
      { id: 'knives', label: 'Knives' },
      { id: 'spoons', label: 'Spoons' },
    ],
  },
];

/**
 * How the sections share the iPad in landscape: two columns, chosen so the
 * two sides come out about the same height and nothing needs scrolling.
 */
export const LANDSCAPE_COLUMNS: string[][] = [
  ['sauces', 'dressings'],
  ['condiments', 'coffee', 'utensils'],
];

export const ALL_ITEMS: Item[] = CATEGORIES.flatMap((c) => c.items);

export const ITEM_IDS = new Set(ALL_ITEMS.map((i) => i.id));
