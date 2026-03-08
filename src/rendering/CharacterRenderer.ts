// src/rendering/CharacterRenderer.ts

import { COLORS } from '../utils/constants';
import { Ragdoll } from '../physics/Ragdoll';

export class CharacterRenderer {
  render(ctx: CanvasRenderingContext2D, ragdoll: Ragdoll) {
    const p = ragdoll.parts;
    ctx.strokeStyle = COLORS.characterOutline;
    ctx.fillStyle = COLORS.character;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';

    // Draw limbs as lines connecting joint positions
    this.drawLimb(ctx, p.upperArmL.position, p.lowerArmL.position);
    this.drawLimb(ctx, p.upperArmR.position, p.lowerArmR.position);
    this.drawLimb(ctx, p.upperLegL.position, p.lowerLegL.position);
    this.drawLimb(ctx, p.upperLegR.position, p.lowerLegR.position);

    // Torso
    const torso = p.torso;
    ctx.save();
    ctx.translate(torso.position.x, torso.position.y);
    ctx.rotate(torso.angle);
    ctx.fillStyle = COLORS.character;
    ctx.fillRect(-6, -14, 12, 28);
    ctx.strokeRect(-6, -14, 12, 28);
    ctx.restore();

    // Head
    ctx.beginPath();
    ctx.arc(p.head.position.x, p.head.position.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.character;
    ctx.fill();
    ctx.stroke();

    // Eyes
    ctx.fillStyle = COLORS.characterOutline;
    const headAngle = p.head.angle;
    const eyeOffsetX = Math.cos(headAngle) * 3;
    const eyeOffsetY = Math.sin(headAngle) * 3;
    ctx.beginPath();
    ctx.arc(p.head.position.x + eyeOffsetX - 2, p.head.position.y + eyeOffsetY - 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.head.position.x + eyeOffsetX + 2, p.head.position.y + eyeOffsetY - 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawLimb(ctx: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }) {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.lineWidth = 4;
    ctx.strokeStyle = COLORS.character;
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = COLORS.characterOutline;
    ctx.stroke();
  }
}
