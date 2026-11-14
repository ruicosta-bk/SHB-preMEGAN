import Phaser from 'phaser';

export class FloatingNumbers {
  private scene: Phaser.Scene;
  private interactionText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.interactionText = scene.add.text(0, 0, '', {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '14px',
      color: '#fef08a',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      padding: { x: 8, y: 4 }
    }).setDepth(50).setVisible(false).setOrigin(0.5);
  }

  public showDamage(x: number, y: number, amount: number, isCrit: boolean = false): void {
    const textStr = isCrit ? `${Math.ceil(amount)}! CHÍ MẠNG` : `${Math.ceil(amount)}`;
    const color = isCrit ? '#f43f5e' : '#ffffff';
    const fontSize = isCrit ? '16px' : '13px';

    const text = this.scene.add.text(x + (Math.random() - 0.5) * 12, y - 10, textStr, {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize,
      fontStyle: isCrit ? 'bold' : 'normal',
      color,
      stroke: '#000000',
      strokeThickness: 3
    }).setDepth(45).setOrigin(0.5);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 32,
      alpha: 0,
      duration: 650,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy()
    });
  }

  public showPrompt(x: number, y: number, promptText: string): void {
    this.interactionText.setPosition(x, y - 30);
    this.interactionText.setText(promptText);
    this.interactionText.setVisible(true);
  }

  public showNotice(x: number, y: number, message: string, color: string = '#f59e0b'): void {
    const text = this.scene.add.text(x, y - 10, message, {
      fontFamily: "'Segoe UI', Roboto, sans-serif",
      fontSize: '13px',
      fontStyle: 'bold',
      color,
      stroke: '#000000',
      strokeThickness: 3
    }).setDepth(45).setOrigin(0.5);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 28,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy()
    });
  }

  public hidePrompt(): void {
    this.interactionText.setVisible(false);
  }

  public destroy(): void {
    this.interactionText.destroy();
  }
}
