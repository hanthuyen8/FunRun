// Learn TypeScript:
//  - https://docs.cocos.com/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/manual/en/scripting/life-cycle-callbacks.html

const { ccclass, property } = cc._decorator;

@ccclass
export default class Movement extends cc.Component
{
    private moveDirection = 0;
    private moveSpeed = 1000;

    onLoad()
    {
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    }

    onDestroy()
    {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    }

    update(dt: number)
    {
        if (this.moveDirection !== 0)
        {
            let pos = this.node.getPosition();
            pos.x += this.moveSpeed * this.moveDirection * dt;
            this.node.setPosition(pos);
        }
    }

    private onKeyDown(ev: cc.Event.EventKeyboard)
    {
        switch (ev.keyCode)
        {
            case cc.macro.KEY.left:
                this.moveDirection = -1;
                break;

            case cc.macro.KEY.right:
                this.moveDirection = 1;
                break;

            default:
                this.moveDirection = 0;
                break;
        }
    }

    private onKeyUp(ev: cc.Event.EventKeyboard)
    {
        this.moveDirection = 0;
    }
}
