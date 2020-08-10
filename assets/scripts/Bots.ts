import BlockSpawner, { BlockManager, BlockTracking } from "./BlockSpawner";
import Character from "./Character";
import { VARIANT_POS_Y } from "./GameSettings";

const { ccclass } = cc._decorator;

@ccclass
export default class Bot extends cc.Component
{
    private blockManager: BlockManager;
    private blockTracker: BlockTracking;
    private character: Character;

    onLoad()
    {
        this.character = this.node.getComponent(Character);
        this.character["isBot"] = true;
    }

    public start()
    {
        this.blockManager = this.node.parent.getComponent(BlockSpawner).BlockManager;
        this.blockTracker = this.blockManager.getNextTurningPoint(this.node.convertToWorldSpaceAR(cc.Vec2.ZERO), 0);
    }

    update(dt: number)
    {
        if (!this.blockTracker)
            return;

        if (this.blockTracker.IsBroken)
        {
            let pos = this.node.getPosition();
            if (pos.y < this.blockTracker.shouldEvadeToY)
            {
                pos.y = VARIANT_POS_Y.find(y => y > pos.y);
                this.node.setPosition(pos);
            }
            else if (pos.y > this.blockTracker.shouldEvadeToY)
            {
                pos.y = VARIANT_POS_Y.find(y => y < pos.y);
                this.node.setPosition(pos);
            }
            else
            {
                this.blockTracker = this.blockManager.getNextTurningPoint(this.node.parent.convertToWorldSpaceAR(pos), this.blockTracker.blockIndex);
            }
        }
    }
}