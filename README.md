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

## ⚡ Các Tính Năng Đậm Chất Soul Knight (Milestone 1 - 3)

1. **Bản Đồ Hầm Ngục Liền Mạch & Hành Lang Kết Nối (Seamless Dungeon)**:
   - 8 phòng phân nhánh kết nối trực tiếp qua **hành lang 3 ô** liền mạch (không còn fade chuyển cảnh tách rời), kèm sương mù Fog of War tự tan khi bước vào phòng mới, đuốc lửa bập bùng, bẫy chông sàn theo chu kỳ, và hòm gỗ vỡ rơi loot.
2. **3 Lớp Anh Hùng & Bạn Đồng Hành Golem Cơ Khí**:
   - **Nhà Giả Kim**: Súng Lục Đồng Cổ, `[F]` Bình Hỏa Giả Kim nổ diện rộng 80px xóa đạn địch & thiêu đốt.
   - **Thích Khách Bóng Đêm**: Đoản Kiếm, `[F]` Ảnh Trảm Đoạt Mệnh lướt chém bất tử, đòn kế 100% Chí Mạng, hạ địch hồi chiêu ngay.
   - **Hộ Vệ Thiết Giáp**: Hỏa Pháo Tán Xạ, `[F]` Khiên Phản Xạ 3 giây chặn & bật ngược đạn địch thành đạn vàng chí mạng.
   - **Golem Cơ Khí (Pet)**: Theo sát người chơi, tự bắn tia hỗ trợ, hút tiền vàng từ xa (<180px) và chặn 1 viên đạn địch mỗi 6 giây.
3. **8 Loại Vũ Khí Đặc Sắc & Tượng Thần Cổ Xưa**:
   - Bổ sung **Cung Tinh Thể Cổ** (giữ chuột gồng lực bắn tên xuyên), **Súng Tia Hợp Hạch** (Laser raycast liên tục), và **Trượng Hỏa Cầu** (3 cầu lửa bám đuổi + Thiêu Đốt), hiển thị xoay 360° trên tay nhân vật kèm độ giật & chớp nòng.
   - **Tượng Thần Cổ Xưa** (12 Vàng tại Phòng Kho Báu): Ban Phước Lành Kỵ Sĩ (tỏa 8 tia vàng khi `[F]`) hoặc Pháp Sư (3 tên lửa đuổi khi `[F]`).
   - Tiêu diệt Boss **Ignis Ignifer** mở ra **Cổng Dịch Chuyển (Boss Portal)** giữa phòng để bước vào hoàn tất màn chơi.
4. **Kinh Tế, Môi Trường & Quái Vật Đa Dạng**:
   - Quái Tinh Anh (**Elite**) kích thước lớn, máu x2.2, hào quang tím; **Pháp Sư Băng Giá (Frost Mage)** bắn tia băng làm chậm 35%; Thùng Thuốc Nổ Đỏ & Chum Độc Xanh nổ dây chuyền; Cửa Hàng Thương Gia Giả Kim.

---

## 💎 Cơ Chế Sinh Tồn & Ba Tài Nguyên

1. **HP (Máu đỏ)**: Không tự hồi. Phục hồi qua Bình Máu, Tượng Thần, hoặc nâng cấp Hút Máu Ma Cà Rồng.
2. **Giáp (Giáp xanh)**: Luôn nhận sát thương trước HP và tự hồi phục sau 3 giây (2.2s với Phiến Giáp Hợp Kim).
3. **Năng lượng (Ngọc xanh)**: Tiêu hao khi dùng vũ khí hạng nặng. Súng lục & Đoản kiếm tiêu tốn **0 NL** chống softlock.
4. **Miễn nhiễm sau đòn đánh (0.8s I-frame)**: Ngăn dồn sát thương tức tử trong cùng khung hình.

---

## 🔫 8 Loại Vũ Khí Độc Lập

1. **Súng Lục Đồng Cổ (Pistol)**: Bắn đơn chính xác cao, 0 NL.
2. **Hỏa Pháo Tán Xạ (Shotgun)**: Bắn chùm 5 mảnh đạn tỏa góc 26°, 3 NL.
3. **Liên Thanh Tinh Thể (Repeater)**: Tốc độ 8.5 phát/giây, 1 NL/phát.
4. **Lôi Kích Xuyên Giáp (Penetrator)**: Chùm plasma xuyên tối đa 3 kẻ địch, 4 NL.
5. **Hư Không Đoản Kiếm (Blade)**: Chém cung 120°, phá đạn địch trong tầm, 0 NL.
6. **Cung Tinh Thể Cổ (Crystal Bow)**: Giữ chuột gồng lực tới 0.75s, thả ra bắn tên xuyên 4 mục tiêu & chí mạng cao, 3 NL.
7. **Súng Tia Hợp Hạch (Fusion Laser)**: Chiếu chùm tia Laser liên tục xuyên thẳng mọi kẻ thù trên đường ngắm, 2 NL.
8. **Trượng Hỏa Cầu (Ember Staff)**: Bắn 3 cầu lửa tự động bám đuổi kẻ địch & gây Thiêu Đốt, 4 NL.

---

## 🧪 12 Nâng Cấp Giả Kim (Chọn 1 trong 3)

| Nâng cấp | Thể loại | Tác dụng chi tiết |
| :--- | :--- | :--- |
| **Phiến Giáp Hợp Kim** | Sinh tồn | +2 Giáp tối đa. Thời gian chờ hồi giáp giảm còn 2.2s. |
| **Tàn Lửa Sinh Mệnh** | Sinh tồn | +3 HP tối đa và lập tức hồi 2 HP. |
| **Tụ Điện Giả Kim** | Tiện ích | +60 Năng lượng tối đa và +50% tỉ lệ rơi ngọc năng lượng. |
| **Đầu Đạn Xuyên Thấu** | Tấn công | Tăng +1 lần xuyên mục tiêu cho vũ khí bắn đạn. |
| **Đạn Phản Xạ Động Năng** | Tấn công | Đạn bật nảy tường 1 lần với 80% sát thương. |
| **Bậc Thầy Kiếm Đạo** | Tấn công | Góc chém 170°, tầm +25%, +3 sát thương & hồi 1 NL mỗi đạn phá. |
| **Lướt Lửa Quá Tải** | Tiện ích | Giảm 35% hồi chiêu Lướt Space. |
| **Khai Nhãn Chí Mạng** | Tấn công | 25% cơ hội nhân đôi sát thương & đẩy lùi cực mạnh. |
| **Hút Máu Ma Cà Rồng** | Sinh tồn | 20% tỉ lệ hồi +1 HP khi tiêu diệt kẻ địch. |
| **Khiên Kháng Bẫy & Gai** | Tiện ích | Miễn nhiễm bẫy chông sàn & +1 HP tối đa. |
| **Đạn Chùm Tỏa Rộng** | Tấn công | Vũ khí bắn nhiều tia tăng thêm +2 viên đạn mỗi phát. |
| **Sóng Xung Kích Phá Giáp** | Sinh tồn | Khi giáp vỡ, nổ 90px quét sạch đạn địch & thiêu đốt quanh người. |

---

## 👹 Kẻ Địch & Đại Boss Ignis Ignifer

- **Homunculus Cận Chiến (Grunt)**: Áp sát và cảnh báo đỏ-trắng trước khi tấn công.
- **Xạ Thủ Bắn Tỉa (Shooter) & Pháp Sư Băng Giá (Frost Mage)**: Ngắm tia cảnh báo trước khi bắn laser hoặc tia băng làm chậm 35%.
- **Pháp Sư Tỏa Đạn (Fan Caster)**: Bắn loạt 5 đạn hình quạt.
- **Thiết Ngưu Húc (Charger)**: Húc tốc độ cao 420 px/s, đâm tường choáng 1.2s.
- **Biến Thể Tinh Anh (Elite)**: Hào quang tím, +25% kích thước, x2.2 máu & rơi nhiều vàng hơn.
- **Đại Pháp Sư Ignis Ignifer (Boss 2 Giai Đoạn)**: Đánh bại để mở Cổng Dịch Chuyển thoát hầm ngục.

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

Chạy toàn bộ 30 bài kiểm thử đơn vị:

```bash
npm test
```

Kết quả:
```text
 ✓ tests/weapon.test.ts (7 tests)
 ✓ tests/run_cycle.test.ts (2 tests)
 ✓ tests/damage.test.ts (6 tests)
 ✓ tests/dungeon.test.ts (5 tests)
 ✓ tests/status.test.ts (3 tests)
 ✓ tests/upgrades.test.ts (2 tests)
 ✓ tests/economy_and_props.test.ts (3 tests)
 ✓ tests/heroes.test.ts (2 tests)

 Test Files  8 passed (8)
      Tests  30 passed (30)
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
