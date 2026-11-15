# Ember Vault — Shared Agent Board

Kênh điều phối giữa Implementation Agent (Antigravity) và Tester/QA Agent (tương ứng `docs/QA_REVIEW.md`).

| Issue | Mô tả | Owner | Trạng thái | Commit | Ghi chú kiểm tra |
|---|---|---|---|---|---|
| QA-001 | Phòng nghỉ không sinh thương nhân | impl-agent | `ready_for_review` | `30b84d3` | `tests/room_reward.test.ts` (2/2 pass) |
| QA-002 | Thùng nổ gây sát thương hai lần | impl-agent | `ready_for_review` | `5404fdf` | `tests/explosion.test.ts` (2/2 pass) |
| QA-003 | Boss Ignis thiếu `combat:enemy-hit` | impl-agent | `ready_for_review` | `cc89e57` | `tests/boss_ignis.test.ts` (1/1 pass) |
| QA-004 | Không thực thi `maxStacks` nâng cấp | impl-agent | `ready_for_review` | `7b74d00` | `tests/upgrades.test.ts` (4/4 pass) |
| QA-005 | Pause không đóng băng toàn bộ gameplay | pending | `todo` | — | Chờ Sprint B |
| QA-006 | Nền nút Pause bị lệch | pending | `todo` | — | Chờ Sprint B |
| QA-007 | Energy Capacitor không tăng drop rate | pending | `todo` | — | Chờ Sprint B |
| QA-008 | Kết nối nội dung Milestone 9 | impl-agent | `review_needed_at_a78adc9` | `a78adc9` | Đã push M9 đầy đủ ngay sau `d248bba`; cần QA kiểm tra lại trên `a78adc9`+ |
