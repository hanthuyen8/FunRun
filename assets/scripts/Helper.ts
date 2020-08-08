export function lerp(min: number, max: number, percent: number): number
{
    return min * (1 - percent) + max * percent;
}

export function clamp(value: number, min = 0, max = 1): number
{
    return Math.min(max, Math.max(min, value));
}

export function convertValueFromRange1_toRange2(range1_min: number, range1_max: number, range2_min: number, range2_max: number, valueInRange1: number): number
{
    return lerp(range2_min, range2_max, inverseLerpClamp(range1_min, range1_max, valueInRange1));
}

/**
 * Hàm đảo nghịch của Lerp
 * @param value giá trị trong khoảng [min;max]
 */
export function inverseLerpUnclamp(min: number, max: number, value: number): number
{
    return (value - min) / (max - min);
}

/**
 * Hàm đảo nghịch của Lerp
 * @param value giá trị trong khoảng [min;max]
 */
export function inverseLerpClamp(min: number, max: number, value: number): number
{
    return clamp((value - min) / (max - min));
}

export function getRandomInt(min: number, max: number): number
{
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function chooseOneOfThose(...value: number[]): number
{
    const step = 1 / (value.length - 1);
    const rand = Math.random();
    const index = Math.round(rand / step);
    return value[index];
}