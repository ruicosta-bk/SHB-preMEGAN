import { WeaponId } from '../types/weapon';

export interface WeaponMergeRecipe {
  inputs: [WeaponId, WeaponId];
  result: WeaponId;
  nameVi: string;
}

export const WEAPON_RECIPES: WeaponMergeRecipe[] = [
  {
    inputs: ['blade', 'bow'],
    result: 'frost_sword',
    nameVi: 'Hàn Băng Đại Kiếm'
  },
  {
    inputs: ['staff', 'laser'],
    result: 'thunder_staff',
    nameVi: 'Lôi Thần Trượng'
  },
  {
    inputs: ['staff', 'penetrator'],
    result: 'thunder_staff',
    nameVi: 'Lôi Thần Trượng'
  },
  {
    inputs: ['repeater', 'shotgun'],
    result: 'inferno_gatling',
    nameVi: 'Hỏa Long Liên Thanh'
  },
  {
    inputs: ['pistol', 'repeater'],
    result: 'inferno_gatling',
    nameVi: 'Hỏa Long Liên Thanh'
  }
];

/**
 * Finds the resulting Tier-2 weapon ID for an order-independent pair of input weapons.
 */
export function findMergeResult(a: WeaponId, b: WeaponId): WeaponId | null {
  for (const recipe of WEAPON_RECIPES) {
    const [first, second] = recipe.inputs;
    if ((first === a && second === b) || (first === b && second === a)) {
      return recipe.result;
    }
  }
  return null;
}

/**
 * Returns all weapon merge recipes for UI/codex display.
 */
export function getAllRecipesForDisplay(): WeaponMergeRecipe[] {
  return WEAPON_RECIPES.map(recipe => ({
    ...recipe,
    inputs: [recipe.inputs[0], recipe.inputs[1]]
  }));
}
