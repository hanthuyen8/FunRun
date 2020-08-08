// Learn TypeScript:
//  - https://docs.cocos.com/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/manual/en/scripting/life-cycle-callbacks.html

import * as Helper from "./Helper"
import BlockSpawner from "./BlockSpawner";
import Character from "./Character";

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
        let height = this.blockPrefab.data.getBoundingBox().height;
        const posY_Variant = [-height, 0, height];
        const blocksContainer = this.generateSpawnPoints(GameMode.HARDMODE_MODE, posY_Variant);

        this.blockSpawners.forEach(x => { x.init(blocksContainer); x.setSpeed(500); });
        this.characters[0].init(true, this.characters[1], height);
        this.characters[1].init(true, this.characters[0], height);
    }

    public getOpponent(sender: Character)
    {
        return this.characters.find(x => x !== sender);
    }

    private generateSpawnPoints(gameMode: GameMode, posY_Variant: number[]): cc.Node
    {
        const startPosX = cc.Canvas.instance.node.width / 2;
        const container = new cc.Node("Blocks Container");
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
                        // Thêm space vào để ngăn chặn tình trạng impossible blocks;
                        cc.log(block_series);
                        block_series = [];
                        continue;
                    }
                }

                const block = cc.instantiate(this.blockPrefab);
                block.name += spawnCount++;
                container.addChild(block);

                block.setPosition(startPosX + blockIndex * size, posY_Variant[currentY]);
            }
            else
            {
                lastX++;
                block_series = [];
            }
        }
        return container;
    }
}

class GameMode
{
    public static readonly EASY_MODE = new GameMode(150, 2, 4);
    public static readonly MEDIUM_MODE = new GameMode(200, 1, 3);
    public static readonly HARDMODE_MODE = new GameMode(250, 0, 2);

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