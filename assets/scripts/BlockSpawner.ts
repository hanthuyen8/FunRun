// Learn TypeScript:
//  - https://docs.cocos.com/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/manual/en/scripting/life-cycle-callbacks.html

import Character from "./Character";
import { inverseLerpUnclamp, clamp } from "./Helper";
import { MAX_RAYCAST_LENGTH, VARIANT_POS_Y, BLOCK_SIZE } from "./GameSettings";

const { ccclass, property } = cc._decorator;

@ccclass
export default class BlockSpawner extends cc.Component
{
    public get BlockManager() { return this.blocksManager; }
    public get RanDeltaDistance() { return this.ranDeltaDistance; }

    private blocksContainer: cc.Node;
    private blocksManager: BlockManager;
    private speed: number = 0;
    private ranDeltaDistance: number;

    public init(blocksContainer: cc.Node): void
    {
        const clone = cc.instantiate(blocksContainer);
        this.node.addChild(clone);
        this.blocksContainer = clone;
        this.blocksManager = new BlockManager(clone.children);
    }

    public setSpeed(speed: number)
    {
        this.speed = speed;
    }

    update(dt: number)
    {
        if (this.speed === 0)
            return;

        const blocksContainer = this.blocksContainer;

        let pos = blocksContainer.getPosition();
        this.ranDeltaDistance = this.speed * dt;
        pos.x -= this.ranDeltaDistance;
        blocksContainer.setPosition(pos);
    }
}

export class BlockManager
{
    private blocks: cc.Node[];

    constructor(blocks: cc.Node[])
    {
        this.blocks = blocks;
    }

    public getNextTurningPoint(targetWPos: cc.Vec2, fromIndex: number): BlockTracking
    {
        const parent = this.blocks[0].parent;
        const targetNPos = parent.convertToNodeSpaceAR(targetWPos);
        const blocksLength = this.blocks.length;
        const blockSize = BLOCK_SIZE;

        const tracker = new BlockTracking(parent);

        let hitBlockIndex: number;

        // Tìm maxBreakPoint
        for (let i = fromIndex; i < blocksLength; i++)
        {
            let block = this.blocks[i];
            if (block.y === targetNPos.y && block.x > targetNPos.x)
            {
                for (let k = i - 1; k >= 0; k--)
                {
                    if (this.isExitableBetweenBlocks(block, this.blocks[k]))
                    {
                        // Tìm thử xem các block phía bên trái của block này có lỗ trống để nhảy vào không?
                        block = this.blocks[k + 1];
                        break;
                    }
                }

                hitBlockIndex = i;

                tracker.hitBlockIndex = hitBlockIndex;
                tracker.maxBreakPoint = tracker.trackThis.x - (block.x - blockSize - targetNPos.x);
                break;
            }
        }

        // Tìm evadeToY cho maxBreakPoint
        // Quét tới block phía bên phải nữa để tìm ra obstacle tiếp theo. Lấy y !== với y của obstacle đó để né được nó.
        for (let i = hitBlockIndex + 1; i < blocksLength; i++)
        {
            const block = this.blocks[i];
            if (block && block.y !== targetNPos.y && block.x > targetNPos.x)
            {
                tracker.evadeToY = VARIANT_POS_Y.find(y => y !== block.y && y !== targetNPos.y);

                let prevBlock = this.blocks[hitBlockIndex - 1];
                if (prevBlock && prevBlock.y === tracker.evadeToY && (prevBlock.x + blockSize) === this.blocks[hitBlockIndex].x)
                {
                    // Nếu điểm nhảy đến lại trùng vị trí của 1 Block khác
                    tracker.evadeToY = block.y;
                }
                break;
            }
        }

        // Tìm minBreakPoint
        // Quét lui về bên trái để tìm ra obstacle nào có y === maxBreakPoint.evadeToY
        for (let i = hitBlockIndex - 1; i >= 0; i--)
        {
            const block = this.blocks[i];
            if (block && block.y === tracker.evadeToY)
            {
                // Tránh trường hợp block bên phải của block này lại vô tình nằm liền kề với nó thì sẽ nhảy trúng ngay.
                // Trong trường hợp này để đỡ phức tạp thì cho minBreakPoint = maxBreakPoint luôn cho khỏe.
                if (!this.blocks[i + 1] || this.blocks[i + 1].x !== block.x + blockSize)
                    tracker.minBreakPoint = tracker.trackThis.x - (block.x + blockSize - targetNPos.x);

                break;
            }
        }
        if (tracker.minBreakPoint == null)
            tracker.minBreakPoint = tracker.maxBreakPoint;

        if (hitBlockIndex + 1 >= blocksLength && tracker.evadeToY == null)
            tracker.evadeToY = VARIANT_POS_Y.find(y => y !== this.blocks[hitBlockIndex].y && y !== this.blocks[blocksLength - 1].y)

        return tracker;

    } // public getNextTurningPoint(targetWPos: cc.Vec2, fromIndex: number): BlockTracking

    public getCollisionPointAhead(targetWPos: cc.Vec2, targetWidth: number, fromIndex: number): BlockTracking
    {
        const parent = this.blocks[0].parent;
        const targetNPos = parent.convertToNodeSpaceAR(targetWPos);
        for (let i = fromIndex; i < this.blocks.length; i++)
        {
            const block = this.blocks[i];
            if (block.y === targetNPos.y && block.x > targetNPos.x)
            {
                let tracker = new BlockTracking(parent);
                tracker.hitBlockIndex = i;
                tracker.minBreakPoint = tracker.maxBreakPoint = block.parent.x - (block.x - targetNPos.x - targetWidth);
                return tracker;
            }
        }
        return null;
    }

    public isCollideWithSomething(targetWPos: cc.Vec2, targetWidth: number, fromIndex: number): boolean
    {
        const parent = this.blocks[0].parent;
        const targetNPos = parent.convertToNodeSpaceAR(targetWPos);

        for (let i = fromIndex; i < this.blocks.length; i++)
        {
            const block = this.blocks[i];
            const distance = block.x - targetNPos.x;
            if (distance > targetWidth)
                return false;

            if (block.y === targetNPos.y && Math.abs(distance) < targetWidth)
            {
                return true;
            }
        }
        return false;
    }

    private isExitableBetweenBlocks(block1: cc.Node, block2: cc.Node): boolean
    {
        if (!block1 || !block2)
            return true;

        const size = BLOCK_SIZE;

        if ((Math.abs(block1.x - block2.x) > size) || (Math.abs(block1.y) - Math.abs(block2.y) !== size))
            return true;

        return false;
    }
}

export class BlockTracking
{
    /** Trả về true nếu sự kiện va chạm đã xảy ra */
    public get IsHitted()
    {
        // Không nên trả về giá trị trung bình giữa minBreakPoint & maxBreakPoint
        // Vì vẫn có trường hợp ở giữa min & max là 1 block khác
        // Nếu trả về trung bình thì nó có khả năng nhảy tới ngay block ở giữa đó.
        return this.trackThis.x <= this.minBreakPoint;
    }

    /** Đối tượng cần theo dõi vị trí */
    public trackThis: cc.Node;

    /** Index của block sẽ đâm trúng nếu vẫn giữ hướng đi */
    public hitBlockIndex: number;

    /** Bắt đầu từ vị trí này có thể chuyển hướng y được */
    public minBreakPoint: number;

    /** Nếu trackThis vượt qua vị trí này thì sẽ đâm trúng Block */
    public maxBreakPoint: number;

    /** Để tránh va chạm thì phải thay đổi y bằng giá trị này */
    public evadeToY: number;

    constructor(trackThisObj: cc.Node)
    {
        this.trackThis = trackThisObj;
    }
}