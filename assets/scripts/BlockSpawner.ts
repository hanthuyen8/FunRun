// Learn TypeScript:
//  - https://docs.cocos.com/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/manual/en/scripting/life-cycle-callbacks.html

import Character from "./Character";
import { inverseLerpUnclamp, clamp } from "./Helper";
import { MAX_RAYCAST_LENGTH } from "./GameSettings";

const { ccclass, property } = cc._decorator;

@ccclass
export default class BlockSpawner extends cc.Component
{
    @property(Character)
    private character: Character = null;

    private blocksContainer: cc.Node;
    private blocksManager: BlockManager;
    private speed: number = 0;

    public init(blocksContainer: cc.Node): void
    {
        const clone = cc.instantiate(blocksContainer);
        this.node.addChild(clone);
        this.blocksContainer = clone;
        this.blocksManager = new BlockManager(clone.children);
        this.character.BlockManager = this.blocksManager;
    }

    public setSpeed(speed: number)
    {
        this.speed = speed;
    }

    update(dt: number)
    {
        if (this.speed === 0)
            return;

        const character = this.character;
        const blocksContainer = this.blocksContainer;
        const blocksManager = this.blocksManager;

        const distance = this.speed * dt;
        let pos = blocksContainer.getPosition();
        pos.x -= distance;
        blocksContainer.setPosition(pos);

        const target = character.node.getBoundingBoxToWorld();
        if (blocksManager.checkCollisionWith(target))
        {
            character.dragX(distance);
        }
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

        // const range = this.blocks.slice(this.blocksRange_min, this.blockRange_max + 1).filter(b => b.y === targetNPos.y);
        // const collider = range.find(b => b.getBoundingBoxToWorld().intersects(targetWRect));
        // if (collider)
        // {
        //     result.collided = true;
        //     result.collidePercent = inverseLerpUnclamp(0, targetWRect.width, collider.x - targetNPos.x);
        // }
        // let aheadBlock = range.find(b => b.x > targetNPos.x);
        // if (aheadBlock)
        //     result.distanceToAhead = aheadBlock.x - targetNPos.x;

        // return result;
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