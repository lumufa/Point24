import { _decorator, Component, Node, Sprite, Graphics, UITransform, Color } from 'cc';
import type { Operator } from '../core/fraction';
import { THEME } from './theme';

const { ccclass, property } = _decorator;

const CORNER_RADIUS = 14;
const BORDER_COLOR = new Color(229, 223, 210, 220);
const SHADOW_COLOR = new Color(30, 25, 15, 70);
const SHADOW_OFFSET_X = 3;
const SHADOW_OFFSET_Y = -6;
const FALLBACK_W = 72;
const FALLBACK_H = 72;

interface OpSlot {
    gfx: Graphics;
    transform: UITransform;
    op: Operator;
}

@ccclass('OperatorPad')
export class OperatorPad extends Component {
    @property(Node) btnPlus: Node | null = null;
    @property(Node) btnMinus: Node | null = null;
    @property(Node) btnMul: Node | null = null;
    @property(Node) btnDiv: Node | null = null;

    private slots: OpSlot[] = [];
    private handlers: Array<{ node: Node; cb: () => void }> = [];

    onLoad() {
        this.setup(this.btnPlus, '+');
        this.setup(this.btnMinus, '-');
        this.setup(this.btnMul, '*');
        this.setup(this.btnDiv, '/');
        this.refresh(null);
    }

    onDestroy() {
        for (const h of this.handlers) {
            h.node.off(Node.EventType.TOUCH_END, h.cb, this);
        }
        this.handlers = [];
    }

    refresh(selectedOp: Operator | null): void {
        for (const slot of this.slots) {
            this.paint(slot, slot.op === selectedOp);
        }
    }

    private setup(node: Node | null, op: Operator): void {
        if (!node) return;

        const sp = node.getComponent(Sprite);
        if (sp) sp.enabled = false;

        const parentT = node.getComponent(UITransform);
        const w = parentT ? parentT.width : FALLBACK_W;
        const h = parentT ? parentT.height : FALLBACK_H;

        const bgNode = new Node('OpBg');
        node.addChild(bgNode);
        bgNode.setSiblingIndex(0);
        const bgT = bgNode.addComponent(UITransform);
        bgT.setContentSize(w, h);
        const gfx = bgNode.addComponent(Graphics);

        this.slots.push({ gfx, transform: bgT, op });

        const cb = () => { this.node.emit('op-tap', op); };
        node.on(Node.EventType.TOUCH_END, cb, this);
        this.handlers.push({ node, cb });
    }

    private paint(slot: OpSlot, active: boolean): void {
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
