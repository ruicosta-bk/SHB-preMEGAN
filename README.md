# ⚔️ Ember Vault - Top-Down Action Roguelite

Game hành động bắn súng Roguelite 2D góc nhìn từ trên xuống (top-down), lấy cảm hứng từ nhịp chiến đấu căng thẳng, né đạn và vượt phòng của *Soul Knight*, nhưng sở hữu cốt truyện, bối cảnh giả kim, đồ họa pixel và hệ thống cơ chế hoàn toàn độc lập.

---

## 🎮 Cách Trải Nghiệm Game Ngay

Máy chủ phát triển cục bộ đang chạy trực tiếp tại:
👉 **[http://localhost:3000/](http://localhost:3000/)** (Mở bằng trình duyệt Brave, Chrome, Edge hoặc Firefox).

---

## 🕹️ Bảng Phím Điều Khiển (Controls)

| Phím / Thao tác | Chức năng | Mô tả chi tiết |
| :--- | :--- | :--- |
| **W, A, S, D** hoặc **Phím Mũi Tên** | **Di chuyển** | Tốc độ di chuyển chuẩn (210 px/s). Chuẩn hóa vector đường chéo: đi chéo không nhanh hơn đi thẳng. |
| **Chuột (Mouse Look)** | **Ngắm bắn** | Nhân vật tự động xoay và hướng tầm nhìn / nòng súng theo con trỏ chuột trong không gian thế giới. |
| **Chuột Trái (Giữ)** | **Tấn công liên tục** | Khai hỏa hoặc vung kiếm tự động theo nhịp bắn (fire rate) của từng loại vũ khí. |
| **Space (Phím Cách)** | **Lướt né đòn (Dash)** | Lướt nhanh (460 px/s, 0.2s) kèm **khoảng thời gian bất tử (I-frame)**. Hồi chiêu 1.5s (giảm xuống 0.97s khi có nâng cấp). Không xuyên tường hoặc cửa khóa. |
| **Phím F** hoặc **Chuột Phải** | **Tuyệt Kỹ Bình Hỏa** | Ném Bình Giả Kim phát nổ diện rộng 80px: **phá toàn bộ đạn địch trong vùng nổ**, gây 20 sát thương và thiêu đốt quái (Burn DoT). Hồi chiêu 6 giây. |
| **Phím Q** | **Đổi vũ khí** | Chuyển đổi linh hoạt giữa ô vũ khí 1 (Súng lục mặc định) và ô vũ khí 2 (Vũ khí nhặt trong hầm). |
| **Phím E** | **Tương tác / Nhặt / Mua** | Nhặt vũ khí, mở Rương Báu Cổ, tiếp nhận Nâng Cấp, hoặc **mua vật phẩm tại Cửa Hàng Thương Gia** bằng Tiền Vàng. |
| **Phím Esc** | **Tạm dừng (Pause)** | Mở Menu Tạm dừng: điều chỉnh âm lượng SFX, bật/tắt tiếng, xem hướng dẫn hoặc chơi lại. |
| **Phím B (Debug Test)** | **Dịch chuyển đến Boss** | Dành riêng cho kiểm thử: nhảy thẳng đến Phòng Boss (Phòng 7) để kiểm tra trận chiến hai giai đoạn. |

---

## ⚡ Các Tính Năng Đậm Chất Soul Knight Vừa Được Bổ Sung

1. **Tuyệt Kỹ Phím [F] / Chuột Phải - Bình Hỏa Giả Kim**:
   - Nhân vật có chiêu thức chủ động (Active Hero Skill).
   - Ném bình thuốc nổ bay theo vòng cung tới vị trí con trỏ chuột, phá hủy mọi đạn địch trong bán kính nổ, giải vây tức thì khi bị dồn vào góc tường.
2. **Thùng Thuốc Nổ Đỏ & Chum Độc Xanh Môi Trường (Interactive Props)**:
   - Xuất hiện trong các phòng chiến đấu làm vật cản đạn (cover) giúp người chơi né tránh làn đạn của xạ thủ.
   - Bị bắn trúng sẽ phát nổ và tạo phản ứng nổ dây chuyền (chain reaction), tiêu diệt hoặc làm chậm/đóng băng quái vật xung quanh.
3. **Kinh Tế Tiền Vàng (Coins) & Cửa Hàng Thương Gia Giả Kim (Shop)**:
   - Quái vật chết rơi ra các đồng tiền vàng lấp lánh có từ tính tự hút về người chơi.
   - Tại Phòng Nghỉ (Phòng 6) trước Boss: Xuất hiện Thương Gia Giả Kim áo choàng tím bí ẩn bày bán Bình Huyết Thạch Lớn (+4 HP), Bình Linh Lực Lớn (+100 NL), và Vũ Khí Hiếm.
4. **Hiệu Ứng Sấm Sét Dây Chuyền (Chain Lightning) & Chí Mạng**:
   - Khi súng Lôi Kích bắn trúng hoặc người chơi gây đòn Chí Mạng (Critical Hit), tia sét xanh phóng sang 2 quái lân cận kèm âm thanh điện giật sống động.
   - Cảm giác va chạm lực mạnh (Screen shake & Hit feedback) tương đương trải nghiệm Soul Knight nguyên bản.

---

## 💎 Cơ Chế Sinh Tồn & Ba Tài Nguyên

1. **HP (Máu đỏ - 6 vạch)**: Không tự hồi. Chỉ phục hồi khi nhặt Bình Máu Giả Kim rơi từ quái hoặc suối phục hồi trong phòng nghỉ / rương.
2. **Giáp (Giáp xanh - 5 vạch)**: Luôn nhận sát thương trước HP. Nếu sát thương vượt quá số giáp hiện có, phần dư sẽ trừ trực tiếp vào HP. Giáp **bắt đầu tự hồi phục sau 3 giây** liên tục không phải nhận sát thương.
3. **Năng lượng (Ngọc xanh - 180 điểm)**: Tiêu hao khi sử dụng các loại vũ khí hạng nặng. Tiêu diệt quái vật hoặc đập vỡ tinh thể sẽ rơi ra mảnh năng lượng để nạp lại.
4. **Cơ chế chống Softlock**: Súng Lục Khởi Đầu tiêu tốn **0 Năng lượng**, đảm bảo người chơi không bao giờ bị kẹt hoặc mất khả năng tấn công khi cạn kiệt năng lượng.
5. **Miễn nhiễm sau đòn đánh (0.8s I-frame)**: Sau khi nhận sát thương, người chơi có 0.8 giây nhấp nháy bất tử nhằm ngăn chặn việc bị dồn sát thương tức tử do nhiều viên đạn va chạm cùng một khung hình.

---

## 🔫 5 Loại Vũ Khí Độc Lập

1. **Súng Lục Đồng Cổ (Pistol)**: Bắn đơn chính xác cao, sát thương 3, tiêu hao 0 NL, tầm bắn 650px. Luôn nằm ở ô vũ khí đầu tiên.
2. **Hỏa Pháo Tán Xạ (Shotgun)**: Bắn chùm 5 mảnh đạn tỏa góc 26°, sát thương 3 × 5 = 15 cực mạnh khi áp sát, tiêu hao 3 NL, tầm bắn hiệu quả 340px.
3. **Liên Thanh Tinh Thể (Repeater)**: Tốc độ xả đạn cực cao (8.5 phát/giây), sát thương 2, tiêu hao 1 NL mỗi phát, độ tản 9°, uy lực áp chế đám đông.
4. **Lôi Kích Xuyên Giáp (Penetrator)**: Chùm năng lượng plasma tím tốc độ 680 px/s, sát thương 9, tiêu hao 4 NL, **xuyên qua tối đa 3 kẻ địch** liên tiếp.
5. **Hư Không Đoản Kiếm (Blade)**: Chém quét hình vòng cung 120°, sát thương 8, tiêu hao 0 NL. **Đặc biệt: Phá hủy toàn bộ đạn địch thông thường nằm trong vùng quét kiếm** kèm hiệu ứng phản đòn âm thanh leng keng.

---

## 🧪 8 Nâng Cấp Giả Kim (Chọn 1 trong 3)

| Nâng cấp | Thể loại | Tác dụng chi tiết |
| :--- | :--- | :--- |
| **Phiến Giáp Hợp Kim** | Sinh tồn | +2 Giáp tối đa. Giảm thời gian chờ hồi giáp từ 3.0s xuống 2.2s. |
| **Tàn Lửa Sinh Mệnh** | Sinh tồn | +3 HP tối đa và lập tức hồi phục 2 HP. |
| **Tụ Điện Giả Kim** | Tiện ích | +60 Năng lượng tối đa và tăng 50% tỉ lệ rơi ngọc năng lượng từ quái vật. |
| **Đầu Đạn Xuyên Thấu** | Tấn công | Tất cả các loại súng được tăng thêm +1 lần xuyên mục tiêu. |
| **Đạn Phản Xạ Động Năng**| Tấn công | Đạn súng bật nảy từ tường 1 lần, duy trì 80% sát thương ban đầu. |
| **Bậc Thầy Kiếm Đạo** | Tấn công | Góc chém mở rộng lên 170°, tầm chém +25%, +3 sát thương kiếm và hồi 1 NL cho mỗi đạn địch phá hủy được. |
| **Lướt Lửa Quá Tải** | Tiện ích | Hồi chiêu Lướt giảm 35% (còn 0.97s), để lại vệt lửa gây 3 sát thương cho quái chạm phải. |
| **Khai Nhãn Chí Mạng** | Tấn công | 25% cơ hội nhân đôi sát thương (Critical Hit) kèm đẩy lùi cực mạnh. |

---

## 👹 Kẻ Địch & Đại Boss Ignis Ignifer

- **Homunculus Cận Chiến (Grunt)**: Di chuyển áp sát người chơi, phát sáng cảnh báo đỏ-trắng 0.35s trước khi tung đòn cào 2 sát thương.
- **Xạ Thủ Bắn Tỉa (Shooter)**: Duy trì cự ly 200-300px, chiếu tia laser đỏ cảnh báo hướng ngắm trong 0.65s, sau đó bắn phi tiêu tốc độ cao.
- **Pháp Sư Tỏa Đạn (Fan Caster)**: Bắn loạt 5 viên đạn hình quạt có khe hở né đạn rộng ở giữa, gây 1 sát thương mỗi viên.
- **Thiết Ngưu Húc (Charger)**: Cảnh báo quỹ đạo đường húc màu cam trong 0.55s, sau đó lao vọt tới với tốc độ 420 px/s gây 3 sát thương; va chạm tường sẽ choáng 1.2s để người chơi phản công.
- **Đại Pháp Sư Ignis Ignifer (Boss 2 Giai Đoạn)**:
  - **Giai đoạn 1 (150 HP)**: Tung bão lửa hướng tâm có 2 khoảng trống thoát hiểm; chuỗi đạn xoắn ốc 16 viên quay theo chiều kim đồng hồ; nhảy đập dậm chấn động với vòng đỏ cảnh báo trước.
  - **Giai đoạn 2 (120 HP)**: Thức tỉnh ngọn lửa đỏ thẫm; bắn chuỗi đạn xoắn ốc kép ngược chiều; đạn lửa dung nham lớn và các đòn dậm liên hoàn; có quãng nghỉ lấy hơi 1.4s giữa các đòn đánh.

---

## 🏛️ Cấu Trúc Dự Án

```
soul-knight-2d/
├── index.html                   # HTML entry point với viewport scale & pixel font CSS
├── package.json                 # Cấu hình scripts & dependencies (Phaser, Vite, Vitest)
├── tsconfig.json                # TypeScript ES2022 bundle config
├── vite.config.mjs              # Vite build & preview configuration
├── src/
│   ├── main.ts                  # Điểm khởi tạo Phaser.Game với 2 Scenes (MainScene + UIScene)
│   ├── types/                   # Định nghĩa interface hệ thống dùng chung
│   │   ├── entity.ts            # Stats, DamageInfo, DamageResult
│   │   ├── weapon.ts            # WeaponData, WeaponId
│   │   ├── room.ts              # RoomState, DoorData, RoomLayout
│   │   ├── upgrade.ts           # UpgradeData, UpgradeId
│   │   └── events.ts            # Strongly typed EventBus schema
│   ├── core/                    # Hệ thống lõi
│   │   ├── EventBus.ts          # Bộ phát sự kiện phi tập trung
│   │   └── AudioSystem.ts       # Bộ tổng hợp âm thanh Web Audio API thủ tục
│   ├── combat/                  # Hệ thống chiến đấu
│   │   ├── DamageCalculator.ts  # Tính toán Giáp/HP/Hồi giáp/Năng lượng (100% test phủ kín)
│   │   └── ProjectilePool.ts    # Quản lý đạn người chơi, đạn địch, phản xạ & phá đạn
│   ├── player/                  # Thực thể người chơi
│   │   └── PlayerController.ts  # Di chuyển, ngắm, lướt I-frame, bắn, đổi vũ khí
│   ├── world/                   # Phòng và hầm ngục
│   │   ├── DungeonGenerator.ts  # Sinh 8 phòng theo seed (BFS chứng minh luôn tới được Boss)
│   │   └── RoomManager.ts       # Dựng phòng, khóa/mở cửa, quái vật, rương, đàn tế
│   ├── enemies/                 # Trí tuệ nhân tạo quái vật & boss
│   │   ├── EnemyBase.ts         # Logic cơ sở, né vật cản, phản hồi trúng đòn
│   │   ├── EnemyGrunt.ts        # Quái cận chiến
│   │   ├── EnemyShooter.ts      # Xạ thủ laser
│   │   ├── EnemyFanCaster.ts    # Pháp sư tỏa đạn
│   │   ├── EnemyCharger.ts      # Quái húc
│   │   └── BossIgnis.ts         # Đại Boss Ignis Ignifer 2 phase
│   ├── presentation/            # Đồ họa thủ tục
│   │   └── TextureGenerator.ts  # Sinh toàn bộ sprite/tile/icon bằng HTML5 Canvas pixel art
│   ├── ui/                      # Giao diện người dùng
│   │   ├── HUD.ts               # Thanh HP/Giáp/NL, Dash meter, Vũ khí, Minimap, Boss Bar
│   │   ├── TitleScreen.ts       # Màn hình bắt đầu game
│   │   ├── PauseModal.ts        # Menu tạm dừng & chỉnh âm thanh
│   │   ├── UpgradeSelectModal.ts# Màn hình chọn 1 trong 3 nâng cấp
│   │   ├── GameOverModal.ts     # Màn hình Thắng / Thua kèm bảng thống kê
│   │   └── FloatingNumbers.ts   # Số sát thương nổi & gợi ý tương tác
│   └── scenes/
│       ├── MainScene.ts         # Scene thế giới gameplay, camera zoom 1.4x, screenshake
│       └── UIScene.ts           # Scene giao diện 1:1 độc lập (1280x720) chống méo/lệch
└── tests/                       # Bộ kiểm thử tự động Vitest
    ├── damage.test.ts           # Kiểm thử Giáp, HP, I-frame, Hồi giáp, Tiêu hao năng lượng
    ├── dungeon.test.ts          # Kiểm thử đồ thị 8 phòng, tính tiếp cận Boss, cửa 2 chiều
    ├── weapon.test.ts           # Kiểm thử thông số 5 loại vũ khí & không softlock
    ├── upgrades.test.ts         # Kiểm thử 8 nâng cấp giả kim
    └── run_cycle.test.ts        # Kiểm thử trạng thái phòng, không sinh thưởng lặp
```

---

## 🧪 Kiểm Thử Tự Động (Unit Testing)

Chạy toàn bộ 20 bài kiểm thử đơn vị:

```bash
npm test
```

Kết quả:
```text
 ✓ tests/run_cycle.test.ts (2 tests)
 ✓ tests/damage.test.ts (6 tests)
 ✓ tests/upgrades.test.ts (2 tests)
 ✓ tests/weapon.test.ts (6 tests)
 ✓ tests/dungeon.test.ts (4 tests)

 Test Files  5 passed (5)
      Tests  20 passed (20)
```

## 🏗️ Lệnh Biên Dịch & Chạy

```bash
# 1. Cài đặt các gói phụ thuộc (đã cài sẵn)
npm install

# 2. Khởi chạy máy chủ phát triển cục bộ
npm run dev

# 3. Biên dịch bản phát hành sản phẩm (Production build)
npm run build

# 4. Xem trước bản build trên cổng cục bộ
npm run preview
```

---

## 🎨 Bản Quyền & Nguồn Gốc Tài Nguyên (Asset Provenance)

- **Đồ họa**: 100% được tạo thủ tục bằng mã nguồn trong `TextureGenerator.ts` thông qua HTML5 Canvas API với bảng màu pixel art giả kim tùy biến. Không sao chép, trích xuất hay sử dụng bất kỳ sprite, hoạt ảnh hoặc logo nào từ *Soul Knight* hay bên thứ ba.
- **Âm thanh**: 100% được tổng hợp thủ tục thời gian thực (Procedural Audio Synthesis) qua Web Audio API (`AudioContext`, dao động sóng Sine/Square/Triangle/Sawtooth, bộ lọc BiquadFilter, và bộ đệm White Noise). Không sử dụng file audio ngoài, hoàn toàn miễn phí bản quyền và không bao giờ gặp lỗi đường truyền/CORS.
