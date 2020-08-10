import BlockSpawner, { BlockManager, BlockWatcher } from "./BlockSpawner";

const { ccclass } = cc._decorator;

@ccclass
export default class Bot extends cc.Component
{
    private blockManager: BlockManager;
    private blockWatcher: BlockWatcher;

    public start()
    {
        this.blockManager = this.node.parent.getComponent(BlockSpawner).BlockManager;
        this.blockWatcher = this.blockManager.getNextTurningPoint(this.node.convertToWorldSpaceAR(cc.Vec2.ZERO), 0);
    }

    update(dt: number)
    {
        if (!this.blockWatcher)
            return;

        if (this.blockWatcher.watch.x <= this.blockWatcher.breakAtX)
        {
            let pos = this.node.getPosition();
            pos.y = this.blockWatcher.shouldEvadeToY;

            this.node.setPosition(pos);
            this.blockWatcher = this.blockManager.getNextTurningPoint(this.node.parent.convertToWorldSpaceAR(pos), this.blockWatcher.blockIndex);
        }
    }

}