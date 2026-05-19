import { Node, Sprite, Graphics, UITransform, Color, Label } from 'cc';
import { THEME } from './theme';

const CORNER_RADIUS = 14;
const BORDER_COLOR = new Color(229, 223, 210, 220);
const SHADOW_COLOR = new Color(30, 25, 15, 70);
const SHADOW_OFFSET_X = 3;
const SHADOW_OFFSET_Y = -6;
const FALLBACK_W = 120;
const FALLBACK_H = 56;

export type ButtonTone = 'default' | 'primary' | 'danger';

export function attachButtonStyle(node: Node | null, tone: ButtonTone = 'default'): void {
    if (!node) return;

    const sp = node.getComponent(Sprite);
    if (sp) sp.enabled = false;

    const parentT = node.getComponent(UITransform);
    const w = parentT ? parentT.width : FALLBACK_W;
    const h = parentT ? parentT.height : FALLBACK_H;

    const bgNode = new Node('BtnBg');
    node.addChild(bgNode);
    bgNode.setSiblingIndex(0);
    const bgT = bgNode.addComponent(UITransform);
    bgT.setContentSize(w, h);
    const gfx = bgNode.addComponent(Graphics);

    paintBackground(gfx, bgT, tone);

    const lbl = node.getComponentInChildren(Label);
    if (lbl) {
        lbl.color = tone === 'default' ? THEME.textDark : THEME.textLight;
    }
}

function paintBackground(gfx: Graphics, transform: UITransform, tone: ButtonTone): void {
    const w = transform.width;
    const h = transform.height;
    const x = -w / 2;
    const y = -h / 2;

    let fill: Color;
    switch (tone) {
        case 'primary': fill = THEME.btnPrimary; break;
        case 'danger': fill = THEME.btnDanger; break;
        default: fill = THEME.btnDefault;
    }

    gfx.clear();

    gfx.fillColor = SHADOW_COLOR;
    gfx.roundRect(x + SHADOW_OFFSET_X, y + SHADOW_OFFSET_Y, w, h, CORNER_RADIUS);
    gfx.fill();

    gfx.fillColor = fill;
    gfx.roundRect(x, y, w, h, CORNER_RADIUS);
    gfx.fill();

    gfx.strokeColor = BORDER_COLOR;
    gfx.lineWidth = 2;
    gfx.roundRect(x, y, w, h, CORNER_RADIUS);
    gfx.stroke();
}
