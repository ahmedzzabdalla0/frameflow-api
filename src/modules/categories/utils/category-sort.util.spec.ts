import { sortCategoriesByPosition } from './category-sort.util';

interface TestCategory {
  name: string;
  position: number | null;
}

describe('sortCategoriesByPosition', () => {
  it('orders categories by ascending position', () => {
    const categories: TestCategory[] = [
      { name: 'music', position: 2 },
      { name: 'travel', position: 0 },
      { name: 'sports', position: 1 },
    ];

    const result = sortCategoriesByPosition(categories);

    expect(result.map((category) => category.name)).toEqual(['travel', 'sports', 'music']);
  });

  it('always places the dislikes category last regardless of position', () => {
    const categories: TestCategory[] = [
      { name: 'dislikes', position: 0 },
      { name: 'travel', position: 5 },
    ];

    const result = sortCategoriesByPosition(categories);

    expect(result.map((category) => category.name)).toEqual(['travel', 'dislikes']);
  });

  it('sorts unpositioned categories alphabetically after positioned ones', () => {
    const categories: TestCategory[] = [
      { name: 'zebra', position: null },
      { name: 'alpha', position: null },
      { name: 'travel', position: 0 },
    ];

    const result = sortCategoriesByPosition(categories);

    expect(result.map((category) => category.name)).toEqual(['travel', 'alpha', 'zebra']);
  });

  it('does not mutate the original array', () => {
    const categories: TestCategory[] = [
      { name: 'b', position: 1 },
      { name: 'a', position: 0 },
    ];
    const original = [...categories];

    sortCategoriesByPosition(categories);

    expect(categories).toEqual(original);
  });
});
