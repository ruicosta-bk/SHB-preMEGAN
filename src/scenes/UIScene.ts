import Phaser from 'phaser';
import { HUD } from '../ui/HUD';
import { TitleScreen } from '../ui/TitleScreen';
import { PauseModal } from '../ui/PauseModal';
import { UpgradeSelectModal } from '../ui/UpgradeSelectModal';
import { GameOverModal, RunStats } from '../ui/GameOverModal';
import { SettingsModal } from '../ui/SettingsModal';
import { CharacterInspectModal, PlayerInspectSnapshot } from '../ui/CharacterInspectModal';
import { events } from '../core/EventBus';
import { audio } from '../core/AudioSystem';
import { HEROES, HeroId, SkillVariant, getHeroSkillMeta } from '../data/heroes';
import { WEAPONS } from '../data/weapons';
import { DifficultyMode } from '../data/difficulty';

export class UIScene extends Phaser.Scene {
  public hud!: HUD;
  public titleScreen!: TitleScreen;
  public pauseModal!: PauseModal;
  public upgradeModal!: UpgradeSelectModal;
  public gameOverModal!: GameOverModal;
  public settingsModal!: SettingsModal;
  public inspectModal!: CharacterInspectModal;
  private inspectButtonContainer: Phaser.GameObjects.Container | null = null;
  private latestInspectSnapshot: PlayerInspectSnapshot | null = null;
  private selectedHeroId: HeroId = 'alchemist';
  private selectedSkillVariant: SkillVariant = 1;
  private selectedDifficultyMode: DifficultyMode = 'normal';
  private activePauseResume: (() => void) | null = null;

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
    this.settingsModal = new SettingsModal(this);
    this.inspectModal = new CharacterInspectModal(this);

    this.createSettingsGearButton();
    this.createInspectButton();

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

    events.on('player:inspect-snapshot', (snapshot: PlayerInspectSnapshot) => {
      this.latestInspectSnapshot = snapshot;
      if (this.inspectModal?.isOpen) {
        this.inspectModal.show(snapshot, () => this.handleInspectClosed());
      }
    });

    events.on('game:restart', () => {
      this.latestInspectSnapshot = null;
      if (this.inspectModal?.isOpen) {
        this.inspectModal.hide();
      }
      this.inspectButtonContainer?.setVisible(!this.titleScreen?.isOpen);
    });

    events.on('game:pause-toggled', (data: { isPaused: boolean; onResume: () => void; onRestart: () => void }) => {
      if (data.isPaused) {
        this.activePauseResume = data.onResume;
        this.pauseModal.show(
          () => {
            this.activePauseResume = null;
            data.onResume();
          },
          () => {
            this.activePauseResume = null;
            data.onRestart();
          },
          this.selectedHeroId,
          this.selectedSkillVariant
        );
      } else {
        this.activePauseResume = null;
        this.pauseModal.hide();
      }
    });

    // Single Esc & Tab listeners live in UIScene so modals work even while MainScene is paused
    this.input.keyboard?.on('keydown-ESC', () => this.handleEscKey());
    this.input.keyboard?.on('keydown-TAB', (event?: KeyboardEvent) => {
      if (this.titleScreen?.isOpen || this.settingsModal?.isOpen) return;
      event?.preventDefault?.();
      this.handleTabKey();
    });
  }

  private createTopBarButton(
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y).setDepth(320).setScrollFactor(0);
    const bg = this.add.graphics();
    const drawBg = (hovered: boolean) => {
      bg.clear();
      bg.fillStyle(hovered ? 0x1e293b : 0x0f172a, 0.94);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
      bg.lineStyle(1.5, hovered ? 0xf59e0b : 0x38bdf8, 0.9);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    };
    drawBg(false);
    container.add(bg);

    const label = this.add.text(0, 0, text, {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '12px',
      color: '#e2e8f0',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(label);

    const zone = this.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => drawBg(true));
    zone.on('pointerout', () => drawBg(false));
    zone.on('pointerdown', onClick);
    container.add(zone);
    return container;
  }

  private createSettingsGearButton(): void {
    this.createTopBarButton(902, 34, 76, 34, '⚙️ Phím', () => {
      audio.playPickup();
      if (this.settingsModal.isOpen) {
        this.settingsModal.hide();
        this.handleSettingsClosed();
      } else {
        this.openSettingsModal();
      }
    });
  }

  private createInspectButton(): void {
    // Positioned at x:300, y:34 (visible only during runs, clear of HUD stats 16..246 & bossBar 420..860)
    this.inspectButtonContainer = this.createTopBarButton(300, 34, 92, 34, '📋 Kỹ năng', () => {
      if (this.titleScreen?.isOpen || this.settingsModal?.isOpen) return;
      audio.playPickup();
      this.toggleInspectModal();
    });
    this.inspectButtonContainer.setVisible(!this.titleScreen?.isOpen);
  }

  public toggleInspectModal(): void {
    if (this.titleScreen?.isOpen || this.settingsModal?.isOpen) return;
    if (this.inspectModal?.isOpen) {
      this.closeInspectModal();
    } else if (!this.isAnyModalOpen) {
      this.openInspectModal();
    }
  }

  public openInspectModal(): void {
    if (this.inspectModal?.isOpen || this.titleScreen?.isOpen || this.settingsModal?.isOpen || this.isAnyModalOpen) {
      return;
    }
    events.emit('player:inspect-request');
    const snapshot = this.latestInspectSnapshot ?? this.buildFallbackInspectSnapshot();
    events.emit('settings:modal-toggled', { isOpen: true });
    this.inspectModal.show(snapshot, () => this.handleInspectClosed());
  }

  private closeInspectModal(): void {
    if (!this.inspectModal?.isOpen) return;
    this.inspectModal.hide();
    this.handleInspectClosed();
  }

  private handleInspectClosed(): void {
    events.emit('settings:modal-toggled', { isOpen: false });
  }

  private buildFallbackInspectSnapshot(): PlayerInspectSnapshot {
    const heroCfg = HEROES[this.selectedHeroId] ?? HEROES.alchemist;
    const skillMeta = getHeroSkillMeta(heroCfg.id, this.selectedSkillVariant);
    const startWeapon = WEAPONS[heroCfg.startWeapon];
    return {
      heroId: heroCfg.id,
      heroNameVi: heroCfg.nameVi,
      skillVariant: this.selectedSkillVariant,
      skillNameVi: skillMeta.nameVi,
      skillCooldownSec: skillMeta.cooldown,
      skillDescVi: skillMeta.descVi,
      statueBlessing: null,
      weapons: startWeapon
        ? [{ nameVi: startWeapon.nameVi, forgeLevel: 0, coreNameVi: null, isActive: true }]
        : [],
      upgrades: []
    };
  }

  public handleTabKey(): void {
    this.toggleInspectModal();
  }

  public openSettingsModal(): void {
    if (this.settingsModal.isOpen) return;
    this.titleScreen?.setInputBlocked(true);
    events.emit('settings:modal-toggled', { isOpen: true });
    this.settingsModal.show(() => this.handleSettingsClosed());
  }

  private handleSettingsClosed(): void {
    this.titleScreen?.setInputBlocked(false);
    events.emit('settings:modal-toggled', { isOpen: false });
  }

  public handleEscKey(): void {
    if (this.settingsModal?.isOpen) {
      this.settingsModal.handleEsc();
      return;
    }
    if (this.inspectModal?.isOpen) {
      this.closeInspectModal();
      return;
    }
    if (this.pauseModal?.isOpen) {
      this.pauseModal.hide();
      const resume = this.activePauseResume;
      this.activePauseResume = null;
      resume?.();
      return;
    }
    if (!this.isAnyModalOpen) {
      events.emit('game:pause-requested');
    }
  }

  private showTitleScreen(): void {
    this.latestInspectSnapshot = null;
    if (this.inspectModal?.isOpen) {
      this.inspectModal.hide();
    }
    this.inspectButtonContainer?.setVisible(false);
    this.titleScreen.show((heroId: HeroId, skillVariant: SkillVariant, difficultyMode: DifficultyMode) => {
      this.selectedHeroId = heroId;
      this.selectedSkillVariant = skillVariant;
      this.selectedDifficultyMode = difficultyMode;
      this.latestInspectSnapshot = null;
      this.inspectButtonContainer?.setVisible(true);
      events.emit('game:restart', { heroId, skillVariant, difficultyMode });
    });
  }

  public get isAnyModalOpen(): boolean {
    return Boolean(
      this.titleScreen?.isOpen ||
        this.pauseModal?.isOpen ||
        this.upgradeModal?.isOpen ||
        this.gameOverModal?.isOpen ||
        this.settingsModal?.isOpen ||
        this.inspectModal?.isOpen
    );
  }
}
