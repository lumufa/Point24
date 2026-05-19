import { _decorator, Component, Label, Sprite, Node, Graphics, UITransform, Color } from 'cc';
import type { Item } from '../state/types';
import { THEME } from './theme';

const { ccclass, property } = _decorator;

const CORNER_RADIUS = 14;
const BORDER_COLOR = new Color(229, 223, 210, 220);
const SHADOW_COLOR = new Color(30, 25, 15, 70);
const SHADOW_OFFSET_X = 3;
const SHADOW_OFFSET_Y = -6;
const FALLBACK_W = 88;
const FALLBACK_H = 120;

@ccclass('CardView')
export class CardView extends Component {
    @property(Label) label: Label | null = null;
    @property(Sprite) background: Sprite | null = null;

    private gfx: Graphics | null = null;
    private bgTransform: UITransform | null = null;
    private currentItem: Item | null = null;

    onLoad() {
        this.node.on(Node.EventType.TOUCH_END, this.onTap, this);
        if (this.background) this.background.enabled = false;

        const parentT = this.node.getComponent(UITransform);
        const w = parentT ? parentT.width : FALLBACK_W;
        const h = parentT ? parentT.height : FALLBACK_H;

        const bgNode = new Node('CardBg');
        this.node.addChild(bgNode);
        bgNode.setSiblingIndex(0);
        const bgT = bgNode.addComponent(UITransform);
        bgT.setContentSize(w, h);
        this.bgTransform = bgT;
        this.gfx = bgNode.addComponent(Graphics);
    }

    onDestroy() {
        this.node.off(Node.EventType.TOUCH_END, this.onTap, this);
    }

    refresh(item: Item | null, selected: boolean, fresh: boolean): void {
        this.currentItem = item;
        if (!item) {
            this.node.active = false;
            return;
        }
        this.node.active = true;
        if (this.label) {
            this.label.string = item.historyText;
            this.label.color = THEME.textDark;
        }
        this.paintBackground(item, selected, fresh);
    }

    private paintBackground(item: Item, selected: boolean, fresh: boolean): void {
        if (!this.gfx || !this.bgTransform) return;
        const w = this.bgTransform.width;
        const h = this.bgTransform.height;
        const x = -w / 2;
        const y = -h / 2;

        let fill: Color;
        if (selected) fill = THEME.cardSelected;
        else if (fresh) fill = THEME.cardFresh;
        else if (item.originKind === 'result') fill = THEME.cardResult;
        else fill = THEME.cardDefault;

        this.gfx.clear();

        this.gfx.fillColor = SHADOW_COLOR;
        this.gfx.roundRect(x + SHADOW_OFFSET_X, y + SHADOW_OFFSET_Y, w, h, CORNER_RADIUS);
        this.gfx.fill();

        this.gfx.fillColor = fill;
        this.gfx.roundRect(x, y, w, h, CORNER_RADIUS);
        this.gfx.fill();

        this.gfx.strokeColor = BORDER_COLOR;
        this.gfx.lineWidth = 2;
        this.gfx.roundRect(x, y, w, h, CORNER_RADIUS);
        this.gfx.stroke();
    }

    private onTap(): void {
        if (!this.currentItem) return;
        this.node.emit('card-tap', this.currentItem.id);
    }
}
