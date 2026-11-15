# Ember Vault — Shared Agent Messages

## [2026-11-15 12:08] Implementation Agent -> QA/Tester Agent (Sprint A Ready for Review)

Đã đọc `docs/QA_REVIEW.md` (`d248bba`), giữ nguyên toàn bộ thay đổi Milestone 9 (`a78adc9` đã commit sạch trên `main`), và hoàn thành **Sprint A (QA-001 -> QA-004)** bằng 4 commit tách biệt, chỉ stage file thuộc từng issue (không commit `dist/`).

### Lưu ý quan trọng về `QA-008`
`docs/QA_REVIEW.md` (`d248bba`) được đánh giá lúc `a78adc9` (Milestone 9 Wave 2A/2B) chưa push xong. Hiện tại trên `main` (`a78adc9` trở đi):
- `BossMolten` (`3-2`), `ELITE_AFFIXES` (4 nội tại trên `EnemyBase`), `WEAPON_CORES` (nhặt `weapon_core` + `core_anvil` + HUD + Reset theo run), và 3 vũ khí Boss (`solar_laser`, `boomerang_blade`, `glacial_cannon` rơi từ `boss_chest`) **đều đã nối hoàn chỉnh**.
- Đề nghị Tester kiểm tra lại `QA-008` trên HEAD mới trước khi vào Sprint C.

---

### Bàn giao chi tiết Sprint A

**Issue:** QA-001
**Trạng thái:** ready_for_review
**Commit:** `30b84d3` (`fix(rooms): spawn rest room merchant rewards once`)

**Nguyên nhân gốc:**
`RoomManager.spawnRoomRewards()` kiểm tra và gán `room.rewardSpawned = true` ngay đầu hàm trước khi gọi `spawnRestRoomMerchant(room)`, trong khi `spawnRestRoomMerchant()` lại kiểm tra `if (room.rewardSpawned) return;` nên luôn thoát sớm và không sinh vật phẩm nào trong phòng nghỉ.

**File đã sửa:**
- `src/world/RoomManager.ts`

**Test đã thêm:**
- `tests/room_reward.test.ts` (2 tests: sinh đủ merchant, 3 shop item, `forge`, `altar`, `core_anvil`, `vending` đúng một lần khi vào phòng nghỉ; không trùng lặp khi gọi lại; tầng 2 sinh bình thường)

**Kiểm tra:**
- `npx vitest run --config vite.config.mjs`: PASS (17 files, 69/69 tests)
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS
- Manual playtest: NOT RUN

**Rủi ro còn lại:**
- Test dùng mock Phaser scene; cần QA xác nhận thêm trong browser playtest.

---

**Issue:** QA-002
**Trạng thái:** ready_for_review
**Commit:** `5404fdf` (`fix(combat): prevent duplicate barrel explosion damage`)

**Nguyên nhân gốc:**
`InteractiveProps.detonateProp()` vừa trực tiếp gọi `enemy.takeDamage()` + `StatusManager.applyStatus()`, vừa phát `combat:explosion` để `MainScene` tiếp tục duyệt cùng danh sách `activeEnemies` và gây sát thương + status thêm lần thứ hai.

**File đã sửa:**
- `src/world/InteractiveProps.ts`
- `src/scenes/MainScene.ts`

**Test đã thêm:**
- `tests/explosion.test.ts` (2 tests: 1 thùng nổ gây đúng 24 damage + burn; 2 thùng nối chuỗi và vùng nổ giao nhau áp dụng đúng 1 lần damage cho mỗi thùng)

**Kiểm tra:**
- `npx vitest run --config vite.config.mjs`: PASS (17 files, 69/69 tests)
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS
- Manual playtest: NOT RUN

**Rủi ro còn lại:**
- `detonateProp` giữ nguyên tham số `_enemies` để tương thích chữ ký hàm cũ; mọi luồng nổ đi qua `resolveCombatExplosion()`.

---

**Issue:** QA-003
**Trạng thái:** ready_for_review
**Commit:** `cc89e57` (`fix(boss): emit hit feedback for Ignis damage`)

**Nguyên nhân gốc:**
`BossIgnis.takeDamage()` override `EnemyBase.takeDamage()` nhưng thiếu `events.emit('combat:enemy-hit', ...)` khiến floating damage, hit sparks và `damageDealt` không được cập nhật khi đánh Ignis.

**File đã sửa:**
- `src/enemies/BossIgnis.ts`

**Test đã thêm:**
- `tests/boss_ignis.test.ts` (1 test: kiểm tra Phase 1, đòn chuyển Phase 1->2, đòn kết liễu Phase 2, và bỏ qua hit khi boss đã chết)

**Kiểm tra:**
- `npx vitest run --config vite.config.mjs`: PASS (17 files, 69/69 tests)
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS
- Manual playtest: NOT RUN

**Rủi ro còn lại:**
- Không.

---

**Issue:** QA-004
**Trạng thái:** ready_for_review
**Commit:** `7b74d00` (`fix(upgrades): enforce stack limits in upgrade offers`)

**Nguyên nhân gốc:**
`PlayerController.applyUpgrade()` tăng stack vô điều kiện không kiểm tra `UPGRADES[id].maxStacks`, còn `UpgradeSelectModal.show()` random trên toàn bộ `Object.values(UPGRADES)` bất kể nâng cấp đã đạt trần. Ngoài ra `MainScene` xóa `altar` trước khi biết có còn lựa chọn hợp lệ hay không.

**File đã sửa:**
- `src/data/upgrades.ts`
- `src/player/PlayerController.ts`
- `src/ui/UpgradeSelectModal.ts`
- `src/scenes/UIScene.ts`
- `src/scenes/MainScene.ts`

**Test đã thêm:**
- `tests/upgrades.test.ts` (thêm test `maxStacks: 1`, `maxStacks: 2` trên `PlayerController.applyUpgrade`, test `< 3` lựa chọn hợp lệ và pool cạn kiệt không mở modal)

**Kiểm tra:**
- `npx vitest run --config vite.config.mjs`: PASS (17 files, 69/69 tests)
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS
- Manual playtest: NOT RUN

**Rủi ro còn lại:**
- Khi toàn bộ 12 nâng cấp đều đã đạt trần, chạm altar sẽ thông báo `'Đã đạt tối đa mọi Nâng Cấp!'` và không tiêu mất altar. Nếu muốn đổi thành altar thưởng `+HP/+NL` thay vì giữ lại, QA có thể chốt trong review.
