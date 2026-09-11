import { Category } from '@prisma/client';
import { DISLIKES_CATEGORY_NAME } from '../../../common/constants/reserved-category.constant';

const UNPOSITIONED_SORT_WEIGHT = Number.MAX_SAFE_INTEGER;

export function sortCategoriesByPosition<T extends Pick<Category, 'name' | 'position'>>(
  categories: readonly T[],
): T[] {
  return [...categories].sort((left, right) => {
    const leftIsDislikes = left.name === DISLIKES_CATEGORY_NAME;
    const rightIsDislikes = right.name === DISLIKES_CATEGORY_NAME;
    if (leftIsDislikes !== rightIsDislikes) {
      return leftIsDislikes ? 1 : -1;
    }

    const leftPosition = left.position ?? UNPOSITIONED_SORT_WEIGHT;
    const rightPosition = right.position ?? UNPOSITIONED_SORT_WEIGHT;
    if (leftPosition !== rightPosition) {
      return leftPosition - rightPosition;
    }

    return left.name.toLowerCase().localeCompare(right.name.toLowerCase());
  });
}
