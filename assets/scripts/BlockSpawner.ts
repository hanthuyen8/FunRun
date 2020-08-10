// Learn TypeScript:
//  - https://docs.cocos.com/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/manual/en/scripting/life-cycle-callbacks.html

import Character from "./Character";
import { inverseLerpUnclamp, clamp } from "./Helper";
import { MAX_RAYCAST_LENGTH, VARIANT_POS_Y } from "./GameSettings";

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
    private viewMaxX: number;
    private viewMinX: number;

    private blocks: cc.Node[];
    private blockWidth: number;

    private blocksRange_min: number;
    private blockRange_max: number;

    constructor(blocks: cc.Node[])
    {
        const canvas = cc.Canvas.instance.node;
        const canvasCenter = canvas.getPosition().x;
        const canvasHalfWidth = canvas.width / 2;
        this.viewMaxX = canvasCenter + canvasHalfWidth;
        this.viewMinX = canvasCenter - canvasHalfWidth;

        this.blocks = blocks;
        this.blockWidth = blocks[0].width;

        this.blocksRange_min = 0;
        this.blockRange_max = blocks.length - 1;
    }

    public getNextTurningPoint(targetWPos: cc.Vec2, fromIndex: number): BlockTracking
    {
        const targetNPos = this.blocks[0].parent.convertToNodeSpaceAR(targetWPos);
        const blocksLength = this.blocks.length;

        let watchedBlock: cc.Node;
        let breakPoint: number;
        let shouldEvadeToY: number;
        let index: number;
        for (let i = fromIndex; i < blocksLength; i++)
        {
            const block = this.blocks[i];
            if (block.y === targetNPos.y && block.x > targetNPos.x)
            {
                let testBlockIndex = i;
                let testPrevBlock: cc.Node;
                let exitable = false;
                do
                {
                    testPrevBlock = this.blocks[--testBlockIndex];
                    if (this.isExitableBetweenBlocks(block, testPrevBlock))
                    {
                        testPrevBlock = this.blocks[++testBlockIndex];
                        exitable = true;
                    }
                }
                while (!exitable)

                watchedBlock = block.parent;
                index = i;
                breakPoint = watchedBlock.x - (testPrevBlock.x - targetNPos.x - block.width);
                break;
            }
        }

        for (let i = index + 1; i < blocksLength; i++)
        {
            const block = this.blocks[i];
            if (block && block.y !== targetNPos.y && block.x > targetNPos.x)
            {
                shouldEvadeToY = VARIANT_POS_Y.find(y => y !== block.y && y !== targetNPos.y);
                let prevBlock = this.blocks[index - 1]
                if (prevBlock && prevBlock.y === shouldEvadeToY && (prevBlock.x + prevBlock.width) === this.blocks[index].x)
                {
                    // Nếu điểm nhảy đến lại trùng vị trí của 1 Block khác
                    shouldEvadeToY = block.y;
                }
                break;
            }
        }

        if (index + 1 >= blocksLength && shouldEvadeToY == null)
            shouldEvadeToY = VARIANT_POS_Y.find(y => y !== this.blocks[blocksLength - 1].y && y !== this.blocks[blocksLength - 2].y)

        if (watchedBlock && breakPoint != null && shouldEvadeToY != null)
            return new BlockTracking(watchedBlock, index, breakPoint, shouldEvadeToY);

        return null;
    }

    public getCollisionPointAhead(targetWPos: cc.Vec2, targetWidth: number, fromIndex: number): BlockTracking
    {
        const targetNPos = this.blocks[0].parent.convertToNodeSpaceAR(targetWPos);
        for (let i = fromIndex; i < this.blocks.length; i++)
        {
            const block = this.blocks[i];
            if (block.y === targetNPos.y && block.x > targetNPos.x)
            {
                const breakAt = block.parent.x - (block.x - targetNPos.x - targetWidth);
                return new BlockTracking(block.parent, i, breakAt, null);
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

    public isSomethingCollidedOrAhead(targetWRect: cc.Rect, rayLength: number, outResult: BlockRaycastResult): boolean
    {
        const targetNPos = this.blocks[0].parent.convertToNodeSpaceAR(targetWRect.center);

        for (let i = this.blocksRange_min; i < this.blocks.length; i++)
        {
            const block = this.blocks[i];
            if (block.y === targetNPos.y)
            {
                const wBlock = block.getBoundingBoxToWorld();
                if (!outResult.collided && wBlock.intersects(targetWRect))
                {
                    // collider
                    outResult.collided = true;
                    outResult.collidePercent = inverseLerpUnclamp(0, targetWRect.width, block.x - targetNPos.x);
                }
                if (block.x >= targetNPos.x)
                {
                    // ahead
                    outResult.distanceToAhead = clamp(block.x - targetNPos.x, 0, rayLength);
                    break;
                }
            }
        }

        if (outResult.collided || outResult.distanceToAhead <= rayLength)
            return true;
        return false;
    }

    public checkCollisionWith(targetWorld: cc.Rect): boolean
    {
        const min = this.blocksRange_min;
        const max = this.blockRange_max;

        if (min === max)
            return false;

        const blockHalfWidth = this.blockWidth / 2;
        let isCollided = false;

        for (let i = min; i <= max; i++)
        {
            const block = this.blocks[i];
            let pos = block.convertToWorldSpaceAR(cc.Vec2.ZERO);
            // Mặc định Block sẽ di chuyển hướng từ bên phải canvas -> bên trái
            if (pos.x - blockHalfWidth <= this.viewMaxX)
            {
                // Block đã từng vào trong canvas
                if (pos.x + blockHalfWidth >= this.viewMinX)
                {
                    // Block đang còn bên trong canvas
                    // Check collision
                    if (block.getBoundingBoxToWorld().intersects(targetWorld))
                    {
                        block.color = cc.Color.RED;
                        isCollided = true;
                    }
                    else
                    {
                        block.color = cc.Color.WHITE;
                    }
                }
                else
                {
                    // Block đã ra ngoài canvas rồi
                    this.blocksRange_min = i;
                }
            }
            else
            {
                // Block chưa vào trong canvas
                this.blockRange_max = cc.misc.clampf(i + 1, 0, this.blocks.length - 1);
                break;
            }
        }
        return isCollided;
    }

    private isExitableBetweenBlocks(block1: cc.Node, block2: cc.Node): boolean
    {
        if (!block1 || !block2)
            return true;

        const size = block2.width;

        if ((Math.abs(block1.x - block2.x) > size) || (Math.abs(block1.y) - Math.abs(block2.y) !== size))
            return true;

        return false;
    }
}

export class BlockRaycastResult
{
    /** Số thứ tự */
    public index: number = 0;

    /** True: đang va chạm với 1 block nào đó */
    public collided: boolean = false;

    /** Nếu > 0 thì collider ở trước mặt, = 0 là ko collide, < 0 là collider ở sau lưng */
    public collidePercent: number = 0;

    /** Khoảng cách từ điểm bắn đến block trước mặt. Max value nếu trước mặt ko có gì cả */
    public distanceToAhead: number = MAX_RAYCAST_LENGTH;

    constructor(index: number)
    {
        this.index = index;
    }
}

export class BlockTracking
{
    /** Trả về true nếu sự kiện va chạm đã xảy ra */
    public get IsBroken() { return this.trackThis.x <= this.breakAtX; }

    /** Đối tượng cần theo dõi vị trí */
    public trackThis: cc.Node;

    /** Index của block cần theo dõi */
    public blockIndex: number;

    /** Tại vị trí này sự kiện chưa xảy ra nhưng vẫn có thể break nếu muốn */
    public mayBreakAtX: number;

    /** Nếu vị trí của Block đã tới điểm này thì sự kiện sẽ xảy ra */
    public breakAtX: number;

    /** Nếu sự kiện xảy ra thì nên thay thế pos.y sang giá trị này để tránh né */
    public shouldEvadeToY: number;

    constructor(watchObj: cc.Node, blockIndex: number, breakAtX: number, shouldEvadeToY: number)
    {
        this.trackThis = watchObj;
        this.blockIndex = blockIndex;
        this.breakAtX = breakAtX;
        this.shouldEvadeToY = shouldEvadeToY;
    }
}