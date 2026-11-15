# Ember Vault - QA Review & Development Backlog

**Ngày đánh giá:** 2026-11-15

**Vai trò:** Tester / QA reviewer

**Phạm vi:** Toàn bộ mã nguồn, luồng gameplay, cấu trúc hệ thống, unit test, typecheck và production build

**Mốc đánh giá:** `025cd2a` cùng các thay đổi Milestone 9 chưa commit đang có trong working tree

**Nguyên tắc:** Tài liệu này chỉ ghi nhận lỗi và đề xuất. Không thay đổi gameplay hoặc mã nguồn.

> Lưu ý: mã nguồn thay đổi đồng thời trong lúc đánh giá. Các số dòng có thể dịch chuyển; hãy tìm theo tên hàm và đoạn mã được nêu nếu liên kết không còn đúng sau các commit tiếp theo.

## 1. Kết luận nhanh

Ember Vault đã vượt mức prototype cơ bản. Bản hiện tại có:

- 8 anh hùng, mỗi anh hùng có 2 biến thể kỹ năng.
- 14 vũ khí, hệ thống rèn và hợp nhất vũ khí.
- 6 tầng, 3 biome, dungeon sinh theo seed.
- Nhiều loại quái, elite, boss nhiều giai đoạn, companion và turret.
- Meta progression, hai độ khó, kinh tế, cửa hàng và phần thưởng theo run.
- Đồ họa và âm thanh tạo bằng mã, không phụ thuộc asset bên ngoài.

Đánh giá tổng thể:

| Hạng mục | Điểm | Nhận xét |
|---|---:|---|
| Nền tảng kỹ thuật | 7/10 | Cấu trúc đủ tốt để tiếp tục phát triển, nhưng controller chính đã quá lớn. |
| Độ phong phú gameplay | 8/10 | Nhiều hero, weapon, skill, biome và hệ thống bổ trợ. |
| Cảm giác chiến đấu qua thiết kế mã | 7.5/10 | Có dash, i-frame, telegraph, knockback, status, camera shake và VFX. |
| Khả năng bảo trì | 5.5/10 | Nhiều logic tập trung trong vài file 900-2.500 dòng và EventBus chưa type-safe. |
| Mức sẵn sàng phát hành | 5/10 | Còn lỗi tích hợp ảnh hưởng trực tiếp tới shop, damage, pause và reward. |
| Tiềm năng phát triển | 8.5/10 | Nền gameplay đủ tốt để tạo một vertical slice chất lượng cao. |

Khuyến nghị chính: tạm dừng thêm hero/vũ khí mới trong một milestone, tập trung hoàn thiện các hệ thống đã có và sửa lỗi tích hợp P0/P1.

## 2. Trạng thái kiểm thử tại thời điểm đánh giá

| Kiểm tra | Kết quả |
|---|---|
| `npm test -- --no-cache` | 14 test files đạt, 62/62 tests đạt |
| `npx tsc --noEmit` | Đạt |
| `npm run build` | Đạt |
| Production bundle | Phaser khoảng 1,48 MB trước gzip; Vite cảnh báo chunk lớn hơn 500 kB |
| Playtest trực tiếp bằng browser automation | Chưa hoàn tất vì công cụ không xác minh được URL cửa sổ game đang mở |

Các test hiện tại chủ yếu kiểm tra dữ liệu và hàm thuần. Chưa có đủ test tích hợp cho Scene, UI interaction, reward lifecycle, pause và chuỗi sự kiện combat. Vì vậy việc toàn bộ unit test đạt chưa đảm bảo một run hoàn chỉnh không có lỗi.

## 3. Danh sách lỗi cần sửa

### QA-001 - Phòng nghỉ không sinh thương nhân và vật phẩm

**Mức độ:** P0 / Blocker gameplay

**Khu vực:** `src/world/RoomManager.ts`

**Hàm liên quan:** `spawnRoomRewards`, `spawnRestRoomMerchant`

**Bằng chứng:**

1. `spawnRoomRewards()` kiểm tra `room.rewardSpawned` rồi đặt giá trị thành `true`.
2. Với phòng `rest`, hàm gọi `spawnRestRoomMerchant(room)`.
3. `spawnRestRoomMerchant()` lại kiểm tra cùng cờ và return ngay vì cờ đã là `true`.

**Cách tái hiện:**

1. Bắt đầu một run.
2. Di chuyển tới phòng nghỉ/thương nhân.
3. Quan sát merchant, shop item, altar, forge và vending machine.

**Kết quả hiện tại:** Phòng nghỉ có thể trống hoàn toàn.

**Kết quả mong đợi:** Merchant cùng toàn bộ item của phòng nghỉ xuất hiện đúng một lần.

**Tiêu chí nghiệm thu:**

- Phòng nghỉ sinh merchant, 3 shop item, altar, forge và vending machine.
- Quay lại phòng không sinh thêm bản sao.
- Chuyển tầng rồi gặp phòng nghỉ mới vẫn sinh reward bình thường.
- Có test tích hợp kiểm tra số pickup sau khi gọi `spawnRoomRewards()` cho phòng `rest`.

---

### QA-002 - Thùng nổ gây sát thương hai lần

**Mức độ:** P0 / Sai cân bằng combat

**Khu vực:** `src/world/InteractiveProps.ts`, `src/scenes/MainScene.ts`

**Hàm liên quan:** `detonateProp`, listener `combat:explosion`

**Bằng chứng:**

- `detonateProp()` tự duyệt enemy và gọi `enemy.takeDamage()`.
- Sau đó hàm phát sự kiện `combat:explosion` với cùng bán kính và damage.
- Listener trong `MainScene` lại duyệt cùng danh sách enemy và gây damage lần nữa.

**Cách tái hiện:**

1. Đặt một enemy đủ gần thùng nổ.
2. Ghi lại HP trước khi thùng nổ.
3. Kích nổ thùng và so sánh lượng HP mất với damage khai báo.

**Kết quả hiện tại:** Enemy có thể nhận hai lần damage cho một vụ nổ.

**Kết quả mong đợi:** Một vụ nổ chỉ áp dụng một lần damage và một lần status.

**Tiêu chí nghiệm thu:**

- Chọn duy nhất một nơi chịu trách nhiệm áp damage: `InteractiveProps` hoặc `MainScene`.
- Chain reaction vẫn hoạt động.
- Một barrel damage 24 chỉ làm enemy mất 24 HP trước modifier, không phải 48.
- Có test cho một barrel, hai barrel nối chuỗi và enemy nằm trong vùng giao nhau.

---

### QA-003 - Boss Ignis không phát sự kiện trúng đòn

**Mức độ:** P0 / Sai feedback và thống kê

**Khu vực:** `src/enemies/BossIgnis.ts`, `src/scenes/MainScene.ts`

**Hàm liên quan:** `BossIgnis.takeDamage`, listener `combat:enemy-hit`

**Bằng chứng:**

- `BossIgnis` override `takeDamage()` nhưng không phát `combat:enemy-hit`.
- Damage number, hit VFX và biến `damageDealt` chỉ cập nhật từ sự kiện này trong `MainScene`.
- `BossFrost` đã có cách xử lý đúng và có thể dùng làm mẫu đối chiếu.

**Cách tái hiện:**

1. Vào phòng Boss Ignis.
2. Tấn công boss.
3. Quan sát damage number/VFX và thống kê tổng damage cuối run.

**Kết quả hiện tại:** Damage lên Ignis có thể không hiện số, thiếu hit VFX và không cộng vào tổng damage.

**Kết quả mong đợi:** Mọi hit hợp lệ lên boss phát đúng một sự kiện combat hit.

**Tiêu chí nghiệm thu:**

- Mỗi hit lên Ignis tăng `damageDealt` đúng một lần.
- Có floating number và hit sparks.
- Damage chuyển phase không bị mất hoặc cộng hai lần.
- Test cả phase 1, chuyển phase và phase 2 chết.

---

### QA-004 - `maxStacks` của nâng cấp chưa được thực thi

**Mức độ:** P0 / Sai progression

**Khu vực:** `src/player/PlayerController.ts`, `src/ui/UpgradeSelectModal.ts`, `src/data/upgrades.ts`

**Hàm liên quan:** `applyUpgrade`, `UpgradeSelectModal.show`

**Bằng chứng:**

- Dữ liệu có `maxStacks` từ 1 đến 2.
- `applyUpgrade()` luôn tăng stack mà không kiểm tra trần.
- Modal chọn ngẫu nhiên từ toàn bộ `UPGRADES`, không loại nâng cấp đã đạt trần.

**Cách tái hiện:**

1. Nhận một nâng cấp có `maxStacks: 1`.
2. Mở thêm nhiều altar.
3. Kiểm tra nâng cấp đó có xuất hiện hoặc được áp dụng lại hay không.

**Kết quả hiện tại:** Có thể vượt trần hoặc nhận một lựa chọn không tạo thêm hiệu ứng.

**Kết quả mong đợi:** Upgrade đạt trần không xuất hiện trong offer và không thể tăng thêm stack.

**Tiêu chí nghiệm thu:**

- `applyUpgrade()` tự bảo vệ trước stack vượt trần.
- Modal chỉ chọn trong danh sách upgrade còn hợp lệ.
- Nếu còn ít hơn 3 upgrade hợp lệ, UI hiển thị đúng số lựa chọn còn lại.
- Có test cho `maxStacks: 1`, `maxStacks: 2` và pool đã hết nâng cấp.

---

### QA-005 - Pause không thực sự đóng băng Scene

**Mức độ:** P1 / Lỗi trạng thái game

**Khu vực:** `src/scenes/MainScene.ts`, `src/ui/PauseModal.ts`

**Hàm liên quan:** `togglePause`, `update`

**Bằng chứng:**

- Pause chỉ đặt `isPaused` và khiến `MainScene.update()` return.
- Phaser tweens, delayed calls và scene timers không được pause theo cùng trạng thái.
- Các kỹ năng dùng tween/delayed callback có thể tiếp tục hoàn thành khi menu đang mở.

**Cách tái hiện đề xuất:**

1. Dùng Bình Hỏa hoặc một kỹ năng có tween.
2. Nhấn Esc ngay sau khi kích hoạt.
3. Quan sát vụ nổ, callback và các animation trong khi pause.

**Kết quả mong đợi:** Toàn bộ gameplay time dừng; chỉ UI pause tiếp tục nhận input.

**Tiêu chí nghiệm thu:**

- Projectile, enemy, cooldown, tweens và delayed callbacks đều đứng yên.
- Resume tiếp tục từ đúng trạng thái trước pause.
- Blur auto-pause có hành vi giống Esc pause.
- Không làm pause UIScene.

---

### QA-006 - Nền nút Pause không dùng tọa độ nút

**Mức độ:** P1 / UI defect

**Khu vực:** `src/ui/PauseModal.ts`

**Hàm liên quan:** `createButton`

**Bằng chứng:** `fillRoundedRect()` vẽ tại `(-w/2, -h/2)` trong container cha, trong khi text và hit zone dùng `(x, y)`.

**Kết quả hiện tại:** Các nền nút có thể chồng tại tâm panel; chữ và vùng bấm nằm ở vị trí khác.

**Kết quả mong đợi:** Background, label và hit zone của từng nút trùng khớp hoàn toàn.

**Tiêu chí nghiệm thu:**

- Kiểm tra trực quan các nút âm lượng, mute, resume và restart.
- Hover/click không lệch vùng hiển thị.
- Test hoặc snapshot UI nếu hạ tầng cho phép.

---

### QA-007 - Mô tả Tụ Điện Giả Kim không khớp cơ chế

**Mức độ:** P1 / Gameplay contract

**Khu vực:** `src/data/upgrades.ts`, `src/player/PlayerController.ts`, `src/world/RoomManager.ts`

**Bằng chứng:** Upgrade mô tả tăng 50% tỉ lệ rơi ngọc năng lượng, nhưng `rollEnemyDrop()` không đọc upgrade của player và luôn dùng tỉ lệ cố định.

**Kết quả mong đợi:** Hoặc triển khai bonus drop thực sự, hoặc sửa mô tả để chỉ nói về +60 max energy.

**Tiêu chí nghiệm thu nếu giữ bonus drop:**

- Tỉ lệ drop có công thức rõ ràng và không vượt 100%.
- Stack thứ hai áp dụng theo quy tắc được xác định trước.
- Test dùng RNG cố định để xác nhận tỉ lệ trước/sau upgrade.

---

### QA-008 - Nội dung Milestone mới chưa nối đủ vào gameplay

**Mức độ:** P1 / Incomplete feature integration

**Khu vực:** `src/data/weaponCores.ts`, `src/data/eliteAffixes.ts`, `src/data/weapons.ts`, `src/world/DungeonGenerator.ts`, boss classes

**Quan sát:**

- Weapon Core có dữ liệu và test nhưng chưa có luồng gắn core, drop core hoặc hiển thị core trong HUD.
- Elite Affix có dữ liệu nhưng chưa thấy runtime áp affix lên elite.
- Các vũ khí `solar_laser`, `boomerang_blade`, `glacial_cannon` có dữ liệu/texture nhưng chưa thấy loot path hoặc boss drop path.
- Các boss mới phải được kiểm tra lại để bảo đảm generator thực sự sinh đúng boss theo biome. Tại thời điểm đánh giá, boss floor vẫn có nhánh sinh Ignis cố định.

**Tiêu chí nghiệm thu:**

- Mỗi dữ liệu mới có một đường đi hoàn chỉnh: tạo ra -> hiển thị -> sử dụng -> lưu trạng thái trong run -> dọn dẹp khi restart.
- Boss biome tương ứng xuất hiện bằng gameplay bình thường, không cần debug shortcut.
- Boss weapon có nguồn drop rõ ràng và hành vi đặc thù hoạt động, không chỉ có stats.
- Elite affix có telegraph trực quan và gameplay modifier thực tế.

## 4. Rủi ro hiệu năng

### PERF-001 - Quét collider toàn tầng mỗi frame

**Mức độ:** P1 trước khi tăng số lượng đạn/quái

**Khu vực:** `RoomManager.getAllSolidColliders`, `MainScene.update`, `ProjectilePool.update`

Hiện tại mỗi frame tạo lại các mảng collider. Projectile lại kiểm tra qua danh sách tường/prop của toàn tầng. Với giới hạn khoảng 300 projectile và hàng trăm collider, boss phase 2 hoặc phòng nhiều turret có thể tạo ra lượng phép kiểm tra lớn.

**Hướng tối ưu:**

1. Chỉ cung cấp collider của phòng hiện tại và hành lang sát bên.
2. Dùng spatial grid đơn giản cho wall, prop, enemy và projectile.
3. Duy trì danh sách projectile active thay vì `filter()` mỗi frame.
4. Tái sử dụng mảng tạm thay vì spread thành mảng mới.
5. Profile trước/sau tại phòng boss đông đạn; không tối ưu theo cảm tính.

**Tiêu chí nghiệm thu:**

- Ghi lại FPS, frame time và số collision checks trong tình huống stress cố định.
- Không thay đổi kết quả collision hoặc làm đạn xuyên tường.
- P95 frame time ổn định trên cấu hình mục tiêu.

### PERF-002 - Chi phí tải và sinh asset ban đầu

- `TextureGenerator.ts` đã vượt khoảng 2.500 dòng và tạo toàn bộ texture khi scene khởi tạo.
- Phaser chunk khoảng 1,48 MB trước gzip.

**Hướng xử lý:**

- Thêm loading screen và đo time-to-play.
- Cân nhắc sinh texture theo nhóm/biome hoặc đóng gói atlas đã tạo sẵn nếu thời gian khởi động cao.
- Giữ procedural asset nếu đây là bản sắc dự án; chỉ thay đổi khi có số đo thực tế.

## 5. Rủi ro kiến trúc và bảo trì

Các file lớn tại thời điểm đánh giá:

| File | Quy mô xấp xỉ |
|---|---:|
| `TextureGenerator.ts` | 2.500 dòng |
| `PlayerController.ts` | 1.900 dòng |
| `MainScene.ts` | 1.170 dòng |
| `RoomManager.ts` | 950 dòng |
| `AudioSystem.ts` | 880 dòng |

Không nên tách file chỉ để giảm số dòng. Tuy nhiên, các trách nhiệm hiện đã đủ độc lập để tách theo hành vi:

- Player movement/dash/collision.
- Weapon firing và weapon-specific behavior.
- Hero skill implementations.
- Run lifecycle và floor transition.
- Combat collision orchestration.
- Reward/shop interaction.

`GameEvents` đã tồn tại nhưng `EventBus` vẫn nhận chuỗi và `any`. Nên generic hóa `on`, `off`, `emit` theo `GameEvents` để compiler bắt sai tên event và sai payload. Đồng thời cần cơ chế unsubscribe rõ ràng nếu scene được restart/recreate.

## 6. Nhận xét thiết kế và cân bằng

### 6.1 Độ dài run

Sáu tầng x tám phòng tạo 48 phòng. Có khoảng 30 encounter bắt buộc nếu tính combat room và guardian/boss room; nhiều combat room có 2-3 wave. Cấu trúc này có nguy cơ tạo run quá dài đối với một roguelite web.

**Đề xuất:**

- Đo thời gian hoàn thành thực tế với người chơi mới và người chơi quen game.
- Mục tiêu tham khảo: run chính 20-30 phút.
- Cho phép đường tắt có rủi ro, hoặc giảm còn 4-6 phòng có ý nghĩa mỗi tầng.
- Thay một phần combat room bằng challenge ngắn, shrine, event hoặc objective room.

### 6.2 Snowball tài nguyên

Game có random drop từ quái, reward cố định sau combat, pet hút vật phẩm, shop, vending buff vĩnh viễn, forge và meta upgrade. Cần theo dõi HP/armor/energy/coin khi rời mỗi tầng để tránh run trở nên quá dễ sau vài nâng cấp đầu.

### 6.3 Meta progression

Meta hiện chủ yếu tăng sức mạnh trực tiếp. Nên bổ sung unlock theo chiều ngang như core, recipe, encounter, modifier hoặc hero option. Quá nhiều permanent stats sẽ làm người chơi mới thấy khó trong khi người chơi lâu năm mất thử thách.

### 6.4 Biome identity

Mỗi biome nên thay đổi quyết định chiến đấu, không chỉ đổi texture và enemy pool:

- Băng: quán tính, vị trí an toàn di chuyển theo chu kỳ, shatter build.
- Dung nham: khu vực an toàn thu hẹp, chain explosion, quản lý không gian.
- Hầm đá: cover, trap, line-of-sight và phục kích.

## 7. Thứ tự triển khai đề xuất

### Milestone A - Stabilization

1. QA-001 phòng nghỉ.
2. QA-002 double explosion.
3. QA-003 Ignis combat event.
4. QA-004 upgrade stack cap.
5. QA-005 pause thực sự.
6. QA-006 pause UI.
7. QA-007 mô tả/drop rate.
8. Thêm integration tests tương ứng.

### Milestone B - Hoàn thiện nội dung đã bắt đầu

1. Nối boss theo biome.
2. Nối boss weapon vào loot loop.
3. Triển khai Weapon Core end-to-end.
4. Triển khai Elite Affix end-to-end.
5. Đồng bộ HUD, tooltip và README.

### Milestone C - Performance & maintainability

1. Profile combat stress case.
2. Current-room collision set hoặc spatial grid.
3. Active projectile list và tái sử dụng buffer.
4. Tách PlayerController/MainScene theo trách nhiệm.
5. Type-safe EventBus.

### Milestone D - Release readiness

1. Browser E2E: title -> chọn hero/skill/difficulty -> combat -> shop -> boss -> portal -> restart.
2. Gamepad, remap phím, tùy chọn screen shake/flashing.
3. Loading screen và kiểm tra thời gian tải.
4. Chạy playtest cân bằng đủ tám hero và hai difficulty.

## 8. Definition of Done cho agent sửa lỗi

Một mục chỉ được đánh dấu hoàn thành khi:

- Có nguyên nhân gốc được xác định, không chỉ che triệu chứng.
- Thay đổi giới hạn đúng phạm vi của issue.
- Có test tự động phù hợp hoặc ghi rõ lý do cần manual test.
- `npm test -- --no-cache` đạt.
- `npx tsc --noEmit` đạt.
- `npm run build` đạt.
- Không làm thay đổi behavior ngoài phạm vi issue.
- Với UI/gameplay, có checklist playtest và kết quả thực tế.
- README/tooltips được cập nhật nếu contract với người chơi thay đổi.

## 9. Checklist regression tối thiểu

- [ ] Bắt đầu run với từng hero và cả hai skill variant.
- [ ] Dash, i-frame, wall collision và blur auto-pause.
- [ ] Hai slot vũ khí, đổi súng, merge, forge và thiếu năng lượng.
- [ ] Melee phá đạn, projectile pierce/bounce/homing/beam.
- [ ] Burn, freeze, poison, lightning và shatter.
- [ ] Crate, explosive barrel, toxic barrel và chain reaction.
- [ ] Treasure, rest/shop, altar, statue, vending và forge.
- [ ] Multi-wave room, door lock/unlock và reward không sinh lặp.
- [ ] Boss phase transition, boss summon, boss bar và boss drop.
- [ ] Chuyển đủ 6 tầng và victory portal.
- [ ] Game over, victory, gem reward, meta upgrade và restart sạch state.
- [ ] Normal và Nightmare Mode.
- [ ] Pause/resume trong lúc projectile, tween và skill đang hoạt động.
- [ ] FPS stress test với nhiều enemy, turret, VFX và projectile.

## 10. Tài liệu cần đồng bộ

README hiện mô tả số lượng hero, weapon và test thấp hơn bản hiện tại. Sau khi Milestone 9 ổn định, cập nhật tối thiểu:

- 8 hero và 2 skill variant mỗi hero.
- 14 weapon và recipe merge hiện có.
- 6 tầng, 3 biome, các boss thực sự có thể gặp.
- Normal/Nightmare Mode.
- Soul Gem meta progression.
- Số lượng test thực tế.
- Cấu trúc thư mục mới: effects, meta, difficulty, merges, core/affix nếu đã tích hợp.
