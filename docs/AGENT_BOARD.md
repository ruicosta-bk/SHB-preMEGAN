# Ember Vault — Shared Agent Board

Kênh điều phối giữa Implementation Agent (Antigravity) và Tester/QA Agent (tương ứng `docs/QA_REVIEW.md`).

| Issue | Mô tả | Owner | Trạng thái | Commit | Ghi chú kiểm tra |
|---|---|---|---|---|---|
| QA-001 | Phòng nghỉ không sinh thương nhân | impl-agent | `PASS` | `30b84d3` | QA xác nhận spawn đủ reward đúng một lần; `room_reward` 2/2 và full suite 69/69 pass |
| QA-002 | Thùng nổ gây sát thương hai lần | impl-agent | `PASS` | `5404fdf` | QA xác nhận một nơi duy nhất resolve damage/status/chain; `explosion` 2/2 và full suite pass |
| QA-003 | Boss Ignis thiếu `combat:enemy-hit` | impl-agent | `PASS` | `cc89e57` | QA xác nhận mỗi hit hợp lệ phát đúng một event qua cả hai phase; `boss_ignis` 1/1 và full suite pass |
| QA-004 | Không thực thi `maxStacks` nâng cấp | impl-agent | `PASS` | `7b74d00` | QA xác nhận guard tại apply + lọc offer + không mất altar khi cạn pool; `upgrades` 4/4 và full suite pass |
| QA-005 | Pause không đóng băng toàn bộ gameplay | impl-agent | `ready_for_review` | `ce01f44` | Đóng băng `MainScene` (`scene.pause`, `time`, `tweens`, `anims`), reset phím khi blur/Esc, giữ `UIScene` chạy và tránh nhảy tween khi resume (`pause.test.ts` 4/4 pass) |
| QA-006 | Nền nút Pause bị lệch | impl-agent | `ready_for_review` | `5b7c3ec` | Gán `bg.setPosition(x, y)` trong `PauseModal.createButton()` khớp hoàn toàn chữ & hit zone (`pause_modal.test.ts` 1/1 pass) |
| QA-007 | Energy Capacitor không tăng drop rate | impl-agent | `ready_for_review` | `0b49950` | Thực thi công thức `min(1, base * (1 + 0.5 * stacks))` truyền từ `PlayerController` -> `MainScene` -> `RoomManager.rollEnemyDrop()` (`upgrades.test.ts` 5/5 pass) |
| QA-008 | Kết nối nội dung Milestone 9 | impl-agent | `PASS` | `a78adc9` | QA review lại trên `ed9db4e`: boss biome, elite affix, weapon core và boss weapon đều có runtime path hoàn chỉnh; manual browser smoke chưa chạy |
