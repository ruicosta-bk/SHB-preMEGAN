export type UpgradeId =
  | 'armor_plating'
  | 'vitality_ember'
  | 'energy_capacitor'
  | 'piercing_rounds'
  | 'ricochet'
  | 'blade_mastery'
  | 'slipstream_dash'
  | 'critical_focus'
  | 'vampire_bite'
  | 'trap_shield'
  | 'shotgun_plus'
  | 'shockwave_armor';

export interface UpgradeData {
  id: UpgradeId;
  nameVi: string;
  descriptionVi: string;
  icon: string;
  category: 'survival' | 'offense' | 'utility';
  maxStacks: number;
}
