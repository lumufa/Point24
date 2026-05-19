import { _decorator, Component, Node, Sprite, Graphics, UITransform, Color } from 'cc';
import { THEME } from './theme';

const { ccclass, property } = _decorator;

export type ModeChoice = 'classic' | 'sprint' | 'daily';

const CORNER_RADIUS = 14;
const BORDER_COLOR = new Color(229, 223, 210, 220);
const SHADOW_COLOR = new Color(30, 25, 15, 70);
const SHADOW_OFFSET_X = 3;
const SHADOW_OFFSET_Y = -6;
const FALLBACK_W = 120;
const FALLBACK_H = 52;

interface ModeSlot {
    gfx: Graphics;
    transform: UITransform;
    choice: ModeChoice;
}

@ccclass('ModePad')
export class ModePad extends Component {
    @property(Node) btnClassic: Node | null = null;
    @property(Node) btnSprint: Node | null = null;
    @property(Node) btnDaily: Node | null = null;

    private slots: ModeSlot[] = [];
    private handlers: Array<{ node: Node; cb: () => void }> = [];

    onLoad() {
        this.setup(this.btnClassic, 'classic');
        this.setup(this.btnSprint, 'sprint');
        this.setup(this.btnDaily, 'daily');
        this.refresh('classic');
    }

    onDestroy() {
        for (const h of this.handlers) {
            h.node.off(Node.EventType.TOUCH_END, h.cb, this);
        }
        this.handlers = [];
    }

    refresh(activeChoice: ModeChoice): void {
        for (const slot of this.slots) {
            this.paint(slot, slot.choice === activeChoice);
        }
    }

    private setup(node: Node | null, choice: ModeChoice): void {
        if (!node) return;

        const sp = node.getComponent(Sprite);
        if (sp) sp.enabled = false;

        const parentT = node.getComponent(UITransform);
        const w = parentT ? parentT.width : FALLBACK_W;
        const h = parentT ? parentT.height : FALLBACK_H;

        const bgNode = new Node('ModeBg');
        node.addChild(bgNode);
        bgNode.setSiblingIndex(0);
        const bgT = bgNode.addComponent(UITransform);
        bgT.setContentSize(w, h);
        const gfx = bgNode.addComponent(Graphics);

        this.slots.push({ gfx, transform: bgT, choice });

        const cb = () => { this.node.emit('mode-tap', choice); };
        node.on(Node.EventType.TOUCH_END, cb, this);
        this.handlers.push({ node, cb });
    }

    private paint(slot: ModeSlot, active: boolean): void {
        const w = slot.transform.width;
        const h = slot.transform.height;
        const x = -w / 2;
        const y = -h / 2;

        const fill = active ? THEME.opSelected : THEME.opDefault;

        slot.gfx.clear();

        slot.gfx.fillColor = SHADOW_COLOR;
        slot.gfx.roundRect(x + SHADOW_OFFSET_X, y + SHADOW_OFFSET_Y, w, h, CORNER_RADIUS);
        slot.gfx.fill();

        slot.gfx.fillColor = fill;
        slot.gfx.roundRect(x, y, w, h, CORNER_RADIUS);
        slot.gfx.fill();

        slot.gfx.strokeColor = BORDER_COLOR;
        slot.gfx.lineWidth = 2;
        slot.gfx.roundRect(x, y, w, h, CORNER_RADIUS);
        slot.gfx.stroke();
    }
}
