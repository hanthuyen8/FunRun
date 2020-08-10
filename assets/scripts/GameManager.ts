// Learn TypeScript:
//  - https://docs.cocos.com/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/manual/en/scripting/life-cycle-callbacks.html

import * as Helper from "./Helper"
import BlockSpawner from "./BlockSpawner";
import Character from "./Character";
import Bot from "./Bots";
import { VARIANT_POS_Y, BLOCK_SIZE } from "./GameSettings";

const { ccclass, property } = cc._decorator;
const MIN_SPEED = 200;
const MAX_SPEED = 700;
const DANGEROUS_BLOCKS_SERIES = ["2,1,0", "0,1,2", "1,1,2", "1,1,0"];
const BLOCKS_SERIES_TEST_LENGTH = 3;

@ccclass
export default class GameManager extends cc.Component
{
    @property(cc.Prefab)
    private blockPrefab: cc.Prefab = null;

    @property([BlockSpawner])
    private blockSpawners: BlockSpawner[] = [];

    @property([Character])
    private characters: Character[] = [];

    start()
    {
        const spawnPoints = this.generateSpawnPoints(GameMode.HARDMODE_MODE, VARIANT_POS_Y);
        const blocksContainer = this.generateBlocksFromPoints(spawnPoints);

        this.blockSpawners.forEach(x => { x.init(blocksContainer); x.setSpeed(500); });
        this.characters[0].addComponent(Bot);
    }

    public getOpponent(sender: Character)
    {
        return this.characters.find(x => x !== sender);
    }

    private generateSpawnPoints(gameMode: GameMode, posY_Variant: number[]): cc.Vec2[]
    {
        const startPosX = cc.Canvas.instance.node.width / 2;
        const points: cc.Vec2[] = [];
        const size = this.blockPrefab.data.width;
        const maxYIndex = posY_Variant.length - 1;

        let lastX = 0;
        let distanceX = 0;
        let spawnCount = 0;
        let blockIndex = -1;

        // prevY và prev_prevY là để kiểm soát không cho sinh ra 3 block liên tiếp nhau mang 3 giá trị y khác nhau
        let block_series = new Array<number>();

        while (spawnCount < gameMode.blockAmount)
        {
            blockIndex++;
            if (lastX === distanceX)
            {
                lastX = 0;
                distanceX = Helper.getRandomInt(gameMode.minDistanceX_Variant, gameMode.maxDistanceX_Variant);

                let currentY: number = Helper.getRandomInt(0, maxYIndex);

                block_series.push(currentY);
                const blocksSeriesLength = block_series.length;
                if (blocksSeriesLength >= BLOCKS_SERIES_TEST_LENGTH)
                {
                    let blocksSeriesTest = block_series.slice(blocksSeriesLength - BLOCKS_SERIES_TEST_LENGTH, blocksSeriesLength);
                    if (DANGEROUS_BLOCKS_SERIES.includes(blocksSeriesTest.toString()))
                    {
                        // Skip để thêm space vào để ngăn chặn tình trạng impossible blocks;
                        block_series = [];
                        continue;
                    }
                }

                points.push(cc.v2(startPosX + blockIndex * size, posY_Variant[currentY]));
                spawnCount++;
            }
            else
            {
                lastX++;
                block_series = [];
            }
        }
        return points;
    }

    private generateBlocksFromPoints(points: cc.Vec2[]): cc.Node
    {
        const container = new cc.Node("Blocks Container");
        for (let i = 0; i < points.length; i++)
        {
            const point = points[i];
            const block = cc.instantiate(this.blockPrefab);
            block.name += i;
            container.addChild(block);

            block.setPosition(point);

            if (CC_DEBUG)
            {
                const labelId = new cc.Node().addComponent(cc.Label);
                labelId.string = i.toString();
                labelId.cacheMode = cc.Label.CacheMode.BITMAP;
                labelId.node.color = cc.Color.BLACK;
                block.addChild(labelId.node);
            }
        }
        return container;
    }

    private findPathToExit(startPos: cc.Vec2, exitPos: cc.Vec2, posY_Variant: number[], blocks: cc.Vec2[], blockSize: number) : cc.Vec2[]
    {
        const paths: cc.Vec2[] = [];
        let obstaclesY: number[] = [];
        let currentPos: cc.Vec2 = startPos;
        let currentlyAtBlockIndex: number;

        while (!currentPos.equals(exitPos))
        {
            currentlyAtBlockIndex = findNextBlock_WithSameY();
            const aheadBlock = blocks[currentlyAtBlockIndex];
            obstaclesY.push(aheadBlock.y);

            currentPos = cc.v2(aheadBlock.x - blockSize, aheadBlock.y);
            paths.push(currentPos);

            const nextBlockIndex = findNextBlock_WithDifferentY();
            obstaclesY.push(blocks[nextBlockIndex].y);

            currentPos = cc.v2(aheadBlock.x - blockSize, getDifferentElementOf(posY_Variant, obstaclesY));
            paths.push(currentPos);
            obstaclesY = [];
        }

        return paths;

        function findNextBlock_WithSameY(): number
        {
            for (let i = currentlyAtBlockIndex; i < blocks.length; i++)
            {
                const block = blocks[i];
                if (block.y === currentPos.y && block.x > currentPos.x)
                {
                    return i;
                }
            }
        }

        function findNextBlock_WithDifferentY(): number
        {
            for (let i = currentlyAtBlockIndex; i < blocks.length; i++)
            {
                const block = blocks[i];
                if (block.y !== currentPos.y && block.x > currentPos.x)
                {
                    return i;
                }
            }
        }

        function getDifferentElementOf(origin: number[], subtract: number[]): number
        {
            for (const e of origin)
            {
                if (!subtract.includes(e))
                    return e;
            }
        }
    }
}

class GameMode
{
    public static readonly EASY_MODE = new GameMode(150, 2, 4);
    public static readonly MEDIUM_MODE = new GameMode(200, 1, 3);
    public static readonly HARDMODE_MODE = new GameMode(50, 0, 2);

    public readonly blockAmount: number;
    public readonly minDistanceX_Variant: number;
    public readonly maxDistanceX_Variant: number;

    private constructor(blockAmount: number, minX: number, maxX: number)
    {
        this.blockAmount = blockAmount;
        this.minDistanceX_Variant = minX;
        this.maxDistanceX_Variant = maxX;
    }
}