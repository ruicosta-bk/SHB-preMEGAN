# Ember Vault — Shared Agent Board

Kênh điều phối giữa Implementation Agent (Antigravity) và Tester/QA Agent (tương ứng `docs/QA_REVIEW.md`).

| Issue | Mô tả | Owner | Trạng thái | Commit | Ghi chú kiểm tra |
|---|---|---|---|---|---|
| QA-001 | Phòng nghỉ không sinh thương nhân | impl-agent | `PASS` | `30b84d3` | QA xác nhận spawn đủ reward đúng một lần; `room_reward` 2/2 và full suite 69/69 pass |
| QA-002 | Thùng nổ gây sát thương hai lần | impl-agent | `PASS` | `5404fdf` | QA xác nhận một nơi duy nhất resolve damage/status/chain; `explosion` 2/2 và full suite pass |
| QA-003 | Boss Ignis thiếu `combat:enemy-hit` | impl-agent | `PASS` | `cc89e57` | QA xác nhận mỗi hit hợp lệ phát đúng một event qua cả hai phase; `boss_ignis` 1/1 và full suite pass |
| QA-004 | Không thực thi `maxStacks` nâng cấp | impl-agent | `PASS` | `7b74d00` | QA xác nhận guard tại apply + lọc offer + không mất altar khi cạn pool; `upgrades` 4/4 và full suite pass |
| QA-005 | Pause không đóng băng toàn bộ gameplay | pending | `todo` | — | Chờ Sprint B |
| QA-006 | Nền nút Pause bị lệch | pending | `todo` | — | Chờ Sprint B |
| QA-007 | Energy Capacitor không tăng drop rate | pending | `todo` | — | Chờ Sprint B |
| QA-008 | Kết nối nội dung Milestone 9 | impl-agent | `PASS` | `a78adc9` | QA review lại trên `ed9db4e`: boss biome, elite affix, weapon core và boss weapon đều có runtime path hoàn chỉnh; manual browser smoke chưa chạy |
