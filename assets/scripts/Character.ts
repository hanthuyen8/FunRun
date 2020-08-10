// Learn TypeScript:
//  - https://docs.cocos.com/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/manual/en/scripting/life-cycle-callbacks.html

import * as Helper from "./Helper"
import BlockSpawner, { BlockManager, BlockRaycastResult, BlockTracking } from "./BlockSpawner"
import { MAX_RAYCAST_LENGTH, MAX_ROW_OF_LANE, CANVAS_WIDTH, BLOCK_SIZE, VARIANT_POS_Y } from "./GameSettings";

const { ccclass, property } = cc._decorator;

@ccclass
export default class Character extends cc.Component
{
    private currentPosYIndex: number = 1;
    private maxPosYIndex: number = 2;
    private startWPosY: number;

    private startPosX: number;
    private deathPosX: number;

    private blockSpawner: BlockSpawner;
    private blockManager: BlockManager;
    private winPercentage: number;
    private currentBlockTracker: BlockTracking;
    private isDamage: boolean = false;
    private isBot: boolean = false;

    onLoad()
    {
        this.deathPosX = this.node.parent.convertToNodeSpaceAR(cc.Vec2.ZERO).x;
        this.startPosX = this.node.getPosition().x;
        this.startWPosY = this.node.convertToWorldSpaceAR(cc.Vec2.ZERO).y;
    }

    start()
    {
        this.blockSpawner = this.node.parent.getComponent(BlockSpawner);
        this.blockManager = this.blockSpawner.BlockManager;

        if (!this.isBot)
        {
            this.checkCollisionAndGetNewBlockTracker();
            cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
        }
    }

    update(dt: number)
    {
        if (!this.currentBlockTracker)
            return;

        if (this.isDamage || (this.currentBlockTracker && this.currentBlockTracker.IsBroken))
        {
            let characterPos = this.node.getPosition();
            characterPos.x -= this.blockSpawner.RanDeltaDistance;
            this.node.setPosition(characterPos);

            if (characterPos.x <= this.deathPosX)
            {
                cc.log("Game Over");
            }

            this.winPercentage = Helper.inverseLerpClamp(this.deathPosX, this.startPosX, characterPos.x)
        }
    }

    onDestroy()
    {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    }

    private checkCollisionAndGetNewBlockTracker()
    {
        this.isDamage = this.blockManager.isCollideWithSomething(this.node.convertToWorldSpaceAR(cc.Vec2.ZERO), this.node.width, 0);
        this.currentBlockTracker = this.blockManager.getCollisionPointAhead(this.node.convertToWorldSpaceAR(cc.Vec2.ZERO), this.node.width, 0);
    }

    private tryToGoUp(): boolean
    {
        if (this.currentPosYIndex === this.maxPosYIndex)
            return false;

        let pos = this.node.getPosition();
        pos.y = VARIANT_POS_Y[++this.currentPosYIndex];
        this.node.setPosition(pos);
        this.checkCollisionAndGetNewBlockTracker();

        return true;
    }

    private tryToGoDown(): boolean
    {
        if (this.currentPosYIndex === 0)
            return false;

        let pos = this.node.getPosition();
        pos.y = VARIANT_POS_Y[--this.currentPosYIndex];
        this.node.setPosition(pos);
        this.checkCollisionAndGetNewBlockTracker();

        return true;
    }

    private onKeyUp(ev: cc.Event.EventKeyboard)
    {
        switch (ev.keyCode)
        {
            case cc.macro.KEY.up:
                this.tryToGoUp();
                break;

            case cc.macro.KEY.down:
                this.tryToGoDown()
                break;

            default:
                break;
        }
    }
}