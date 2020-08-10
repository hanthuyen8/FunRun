// Learn TypeScript:
//  - https://docs.cocos.com/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/manual/en/scripting/life-cycle-callbacks.html

import * as Helper from "./Helper"
import { BlockManager, BlockRaycastResult } from "./BlockSpawner"
import { MAX_RAYCAST_LENGTH, MAX_ROW_OF_LANE, CANVAS_WIDTH, BLOCK_SIZE } from "./GameSettings";

const { ccclass, property } = cc._decorator;
const BOT_MIN_EVADE_DECISION = 0.4;
const BOT_MAX_EVADE_DECISION = 1;
const BOT_ACCEPTED_COLLIDE_PERCENT = 0.1;
const BOT_DECISION_CYCLE = 0.03;

@ccclass
export default class Character extends cc.Component
{
    public set BlockManager(value: BlockManager) { this.blockManager = value; }
    private posY: number[];
    private currentPosYIndex: number = 1;
    private maxPosYIndex: number = 2;
    private startWPosY: number;

    private startPosX: number;
    private deathPosX: number;

    // Player Statistics
    private blockManager: BlockManager;
    private autoplay: boolean = false;
    private decisionCycle: number = 0;
    private winPercentage: number = 1;
    private opponent: Character;
    private prevDirection: FuzzyDirectionScore;

    onLoad()
    {
        this.deathPosX = this.node.parent.convertToNodeSpaceAR(cc.Vec2.ZERO).x;
        this.startPosX = this.node.getPosition().x;
        this.startWPosY = this.node.convertToWorldSpaceAR(cc.Vec2.ZERO).y;
    }

    onDestroy()
    {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    }

    public init(autoplay: boolean, opponent: Character, blockSize: number): void
    {
        this.autoplay = autoplay;
        if (autoplay)
            this.opponent = opponent;
        else
            cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);

        this.posY = [-blockSize, 0, blockSize];
    }

    update(dt: number)
    {
        if (this.autoplay)
        {
            const me = this.node.getBoundingBoxToWorld();
            if (this.decisionCycle <= 0 && this.blockManager.isSomethingCollidedOrAhead(me, BLOCK_SIZE, new BlockRaycastResult(0)))
            {
                this.decisionCycle = BOT_DECISION_CYCLE;
                this.autoEvade();
            }
            this.decisionCycle -= dt;
        }
    }

    public dragX(distance: number): void
    {
        let playerPos = this.node.getPosition();
        playerPos.x -= distance;

        this.node.setPosition(playerPos);

        if (playerPos.x <= this.deathPosX)
        {
            cc.log("Game Over");
        }

        this.winPercentage = Helper.inverseLerpClamp(this.deathPosX, this.startPosX, playerPos.x)
    }

    private tryToGoUp(): boolean
    {
        if (this.currentPosYIndex === this.maxPosYIndex)
            return false;

        let pos = this.node.getPosition();
        pos.y = this.posY[++this.currentPosYIndex];
        this.node.setPosition(pos);
        return true;
    }

    private tryToGoDown(): boolean
    {
        if (this.currentPosYIndex === 0)
            return false;

        let pos = this.node.getPosition();
        pos.y = this.posY[--this.currentPosYIndex];
        this.node.setPosition(pos);
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

    // Bot Functions
    private autoEvade(): void
    {
        // Nếu đối thủ chơi dở thì cũng cho Bot chơi dở theo
        // if (Math.random() > cc.misc.clampf(this.opponent.winPercentage, BOT_MIN_EVADE_DECISION, BOT_MAX_EVADE_DECISION))
        //     return;

        const rects: cc.Rect[] = [];
        for (let i = 0; i < this.posY.length; i++)
        {
            rects.push(this.getRectOfDirection(i));
        }

        const distanceFromCharacterToRightViewBorder = CANVAS_WIDTH - this.node.convertToWorldSpaceAR(cc.Vec2.ZERO).x;
        const raycastResults: BlockRaycastResult[] = [];
        for (let i = 0; i < rects.length; i++)
        {
            let result = new BlockRaycastResult(i)
            raycastResults.push(result);
            this.blockManager.isSomethingCollidedOrAhead(rects[i], distanceFromCharacterToRightViewBorder, result);
        }

        let newDirection = FuzzyDirectionScore.fuzzy_getBestDirection(this.currentPosYIndex, distanceFromCharacterToRightViewBorder, raycastResults);
        const decision = raycastResults[newDirection.index];

        // let decisions: BlockRaycastResult[];

        // // Ưu tiên Direction nào hiện tại đang ko collide trước
        // decisions = results.filter(x => !x.collided);
        // if (decisions.length === 0)
        // {
        //     decisions = results;
        // }

        // let decision = findMaxDistance(decisions);

        // if (decision.index === this.currentPosYIndex)
        // {
        //     if (decision.collidePercent > 0 || decision.distanceToAhead < this.node.width * 1.2)
        //     {
        //         // Bắt buộc phải đổi hướng vì đã có block va chạm trước mặt rồi
        //         if (decisions.length > 1)
        //             decision = decisions.find(x => x !== decision);
        //         else
        //             decision = findMaxDistance(results);
        //     }
        // }

        // // Sẽ xảy ra trường hợp character đang ở sát mép, và direction mà nó tìm thấy là ở sát mép đối diện.
        // // Nhưng direction ở giữa lại là collided. Vậy nên sẽ có hiện tượng character vượt rào.
        // // Để tránh hiện tượng này thì tính như sau:
        // let inBetween = Math.abs(decision.index - this.currentPosYIndex) - 1;
        // if (inBetween > 0)
        // {
        //     let middleBlock = results[inBetween];
        //     if (middleBlock.collided)
        //         return;
        // }



        if (decision.index > this.currentPosYIndex)
            this.tryToGoUp();
        else if (decision.index < this.currentPosYIndex)
            this.tryToGoDown();
    }

    private getRectOfDirection(virtualPosYIndex: number)
    {
        const rect = this.node.getBoundingBoxToWorld().clone();
        rect.center = cc.v2(rect.center.x, this.startWPosY + this.posY[virtualPosYIndex]);
        return rect;
    }
}

function findMaxDistance(blocks: BlockRaycastResult[]): BlockRaycastResult
{
    let result: BlockRaycastResult = blocks[0];
    for (const block of blocks)
    {
        if (block.distanceToAhead > result.distanceToAhead)
            result = block;
    }
    return result;
}

class FuzzyDirectionScore
{
    public static readonly CRITERIA_NO_COLLIDED_MAX_SCORE = 1;
    public static readonly CRITERIA_LONGEST_DISTANCE_AHEAD_MAX_SCORE = 1;
    public static readonly CRITERIA_NO_CROSSING_MAX_SCORE = 0.5;
    public static readonly CRITERIA_NO_CHANGE_DIRECTION_MAX_SCORE = 0.1;
    public static readonly GOOD_SCORE =
        FuzzyDirectionScore.CRITERIA_NO_COLLIDED_MAX_SCORE +
        FuzzyDirectionScore.CRITERIA_LONGEST_DISTANCE_AHEAD_MAX_SCORE +
        FuzzyDirectionScore.CRITERIA_NO_CROSSING_MAX_SCORE;

    public get TotalPoint(): number
    {
        return this.noCollidedScore +
            this.longestDistanceAheadScore +
            this.noCrossingScore +
            this.noChangeDirectionScore;
    }

    public get IsBestOption(): boolean { return this.TotalPoint >= FuzzyDirectionScore.GOOD_SCORE; }

    public index = 0;
    public noCollidedScore = 0;
    public longestDistanceAheadScore = 0;
    public noCrossingScore = 0;
    public noChangeDirectionScore = 0;

    private constructor(index: number)
    {
        this.index = index;
    }

    public static fuzzy_getBestDirection(currentDirectionIndex: number, maxDistance: number, blocksRaycastResults: BlockRaycastResult[]): FuzzyDirectionScore
    {
        const fuzzyScores = new Array<FuzzyDirectionScore>(blocksRaycastResults.length);
        for (let i = 0; i < blocksRaycastResults.length; i++)
        {
            const raycast = blocksRaycastResults[i];
            const score = new FuzzyDirectionScore(i);
            fuzzyScores[i] = score;

            if (!raycast.collided)
                score.noCollidedScore = FuzzyDirectionScore.CRITERIA_NO_COLLIDED_MAX_SCORE;

            score.longestDistanceAheadScore =
                Helper.inverseLerpUnclamp(0, maxDistance, raycast.distanceToAhead) * FuzzyDirectionScore.CRITERIA_LONGEST_DISTANCE_AHEAD_MAX_SCORE;

            const crossingIndex = (raycast.index - currentDirectionIndex) - 1;
            if (crossingIndex > 0 && blocksRaycastResults[crossingIndex].collided)
            {
                const absPercent = Math.abs(blocksRaycastResults[crossingIndex].collidePercent);
                const convertedPercentScore = Helper.convertValueFromRange1_toRange2(0, 1, 0, FuzzyDirectionScore.CRITERIA_NO_CROSSING_MAX_SCORE, absPercent);
                score.noCrossingScore = FuzzyDirectionScore.CRITERIA_NO_CROSSING_MAX_SCORE - convertedPercentScore;
            }
            else
            {
                score.noCrossingScore = FuzzyDirectionScore.CRITERIA_NO_CROSSING_MAX_SCORE;
            }

            if (raycast.index === currentDirectionIndex)
                score.noChangeDirectionScore = FuzzyDirectionScore.CRITERIA_NO_CHANGE_DIRECTION_MAX_SCORE;
        }

        let maxScoreIndex: number = 0;
        for (let i = 1; i < fuzzyScores.length; i++)
        {
            if (fuzzyScores[i].TotalPoint > fuzzyScores[maxScoreIndex].TotalPoint)
            {
                maxScoreIndex = i;
            }
        }

        return fuzzyScores[maxScoreIndex];
    }

}
