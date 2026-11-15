import Phaser from 'phaser';
import { HUD } from '../ui/HUD';
import { TitleScreen } from '../ui/TitleScreen';
import { PauseModal } from '../ui/PauseModal';
import { UpgradeSelectModal } from '../ui/UpgradeSelectModal';
import { GameOverModal, RunStats } from '../ui/GameOverModal';
import { events } from '../core/EventBus';
import { HeroId, SkillVariant } from '../data/heroes';
import { DifficultyMode } from '../data/difficulty';

export class UIScene extends Phaser.Scene {
  public hud!: HUD;
  public titleScreen!: TitleScreen;
  public pauseModal!: PauseModal;
  public upgradeModal!: UpgradeSelectModal;
  public gameOverModal!: GameOverModal;
  private selectedHeroId: HeroId = 'alchemist';
  private selectedSkillVariant: SkillVariant = 1;
  private selectedDifficultyMode: DifficultyMode = 'normal';

  constructor() {
    super({ key: 'UIScene' });
  }

  public create(): void {
    // UI Camera stays at 1:1 scale (1280x720) with no scroll
    this.cameras.main.setZoom(1.0);
    this.cameras.main.setScroll(0, 0);

    // Initialize UI components
    this.hud = new HUD(this);
    this.titleScreen = new TitleScreen(this);
    this.pauseModal = new PauseModal(this);
    this.upgradeModal = new UpgradeSelectModal(this);
    this.gameOverModal = new GameOverModal(this);

    // FPS & Performance monitor
    const fpsText = this.add.text(1260, 146, 'FPS: 60', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '11px',
      color: '#64748b'
    }).setOrigin(1, 0).setDepth(150);

    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        const fps = Math.round(this.game.loop.actualFps);
        const delta = Math.round(this.game.loop.delta);
        fpsText.setText(`FPS: ${fps} (${delta}ms)`);
      }
    });

    // Initial Title Screen
    this.showTitleScreen();

    // Event hooks from MainScene
    const openGameOverModal = (stats: RunStats) => {
      this.gameOverModal.show(
        stats,
        () => {
          events.emit('game:restart', {
            heroId: this.selectedHeroId,
            skillVariant: this.selectedSkillVariant,
            difficultyMode: this.selectedDifficultyMode
          });
        },
        () => {
          events.emit('game:return-lobby');
          this.showTitleScreen();
        }
      );
    };

    events.on('game:over', openGameOverModal);
    events.on('game:victory', openGameOverModal);

    events.on('upgrade:offer', (data: { choices?: any[]; onSelected: (upg: any) => void }) => {
      this.upgradeModal.show(data.choices ?? [], (selected) => {
        data.onSelected(selected);
      });
    });

    events.on('game:pause-toggled', (data: { isPaused: boolean; onResume: () => void; onRestart: () => void }) => {
      if (data.isPaused) {
        this.pauseModal.show(
          () => data.onResume(),
          () => data.onRestart()
        );
      } else {
        this.pauseModal.hide();
      }
    });
  }

  private showTitleScreen(): void {
    this.titleScreen.show((heroId: HeroId, skillVariant: SkillVariant, difficultyMode: DifficultyMode) => {
      this.selectedHeroId = heroId;
      this.selectedSkillVariant = skillVariant;
      this.selectedDifficultyMode = difficultyMode;
      events.emit('game:restart', { heroId, skillVariant, difficultyMode });
    });
  }

  public get isAnyModalOpen(): boolean {
    return (
      (this.titleScreen && this.titleScreen.isOpen) ||
      (this.pauseModal && this.pauseModal.isOpen) ||
      (this.upgradeModal && this.upgradeModal.isOpen) ||
      (this.gameOverModal && this.gameOverModal.isOpen)
    );
  }
}
