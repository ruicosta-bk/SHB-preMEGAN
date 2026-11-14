import { UpgradeData, UpgradeId } from '../types/upgrade';

export const UPGRADES: Record<UpgradeId, UpgradeData> = {
  armor_plating: {
    id: 'armor_plating',
    nameVi: 'Phiến Giáp Hợp Kim',
    descriptionVi: 'Tăng +2 Giáp tối đa. Thời gian chờ hồi giáp giảm 0.8 giây.',
    icon: 'icon_up_armor',
    category: 'survival',
    maxStacks: 2
  },
  vitality_ember: {
    id: 'vitality_ember',
    nameVi: 'Tàn Lửa Sinh Mệnh',
    descriptionVi: 'Tăng +3 HP tối đa và lập tức hồi lại 2 HP.',
    icon: 'icon_up_hp',
    category: 'survival',
    maxStacks: 2
  },
  energy_capacitor: {
    id: 'energy_capacitor',
    nameVi: 'Tụ Điện Giả Kim',
    descriptionVi: 'Tăng +60 Năng lượng tối đa và tăng 50% tỉ lệ rơi ngọc năng lượng từ quái.',
    icon: 'icon_up_energy',
    category: 'utility',
    maxStacks: 2
  },
  piercing_rounds: {
    id: 'piercing_rounds',
    nameVi: 'Đầu Đạn Xuyên Thấu',
    descriptionVi: 'Tất cả súng tăng +1 lần xuyên mục tiêu (không ảnh hưởng kiếm).',
    icon: 'icon_up_pierce',
    category: 'offense',
    maxStacks: 2
  },
  ricochet: {
    id: 'ricochet',
    nameVi: 'Đạn Phản Xạ Động Năng',
    descriptionVi: 'Đạn súng bật nảy từ tường 1 lần, gây 80% sát thương ban đầu.',
    icon: 'icon_up_bounce',
    category: 'offense',
    maxStacks: 1
  },
  blade_mastery: {
    id: 'blade_mastery',
    nameVi: 'Bậc Thầy Kiếm Đạo',
    descriptionVi: 'Góc chém mở rộng lên 170°, tầm chém +25%, +3 sát thương kiếm và hồi 1 năng lượng mỗi đạn phá được.',
    icon: 'icon_up_blade',
    category: 'offense',
    maxStacks: 1
  },
  slipstream_dash: {
    id: 'slipstream_dash',
    nameVi: 'Lướt Lửa Quá Tải',
    descriptionVi: 'Hồi chiêu Dash giảm 35%, để lại vệt lửa trên đường lướt gây 3 sát thương cho quái chạm phải.',
    icon: 'icon_up_dash',
    category: 'utility',
    maxStacks: 1
  },
  critical_focus: {
    id: 'critical_focus',
    nameVi: 'Khai Nhãn Chí Mạng',
    descriptionVi: '25% tỉ lệ gây sát thương gấp đôi và tạo hiệu ứng đẩy lùi cực mạnh.',
    icon: 'icon_up_crit',
    category: 'offense',
    maxStacks: 1
  }
};
