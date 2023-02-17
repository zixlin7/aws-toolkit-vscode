/*!
 * Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/naming-convention */

// last character of left_context
const characterCoefficientMap: Record<string, number> = {
    8: -1.8879,
    '\\': -1.7724,
    '¸': 1.6861,
    0: -1.5524,
    7: -1.5481,
    9: -1.4448,
    '/': -1.4274,
    '#': -1.3512,
    '@': -1.1093,
    5: -1.1034,
    '}': -1.0644,
    2: -1.0362,
    6: -0.9478,
    1: -0.9092,
    '*': -0.8945,
    ')': -0.8943,
    '>': -0.8411,
    ']': -0.8361,
    Z: -0.8313,
    D: -0.7905,
    '`': -0.7396,
    4: -0.6715,
    R: -0.6629,
    ß: -0.6546,
    '£': -0.6512,
    J: 0.6367,
    '+': -0.6115,
    B: 0.5925,
    '.': -0.5725,
    '^': -0.5627,
    z: -0.5323,
    '&': -0.525,
    3: -0.5244,
    '[': -0.511,
    '-': -0.5109,
    '!': -0.5054,
    P: -0.4883,
    '~': -0.4785,
    ｋ: -0.471,
    S: -0.4645,
    f: 0.4541,
    W: -0.447,
    '%': -0.4414,
    'Ⓡ': 0.4365,
    N: -0.4346,
    ą: 0.4239,
    ｎ: 0.4238,
    "'": -0.415,
    の: -0.4096,
    す: -0.4051,
    '\xa0': 0.3933,
    ':': -0.3919,
    X: -0.3908,
    ㅊ: -0.3903,
    ö: 0.3868,
    é: 0.3854,
    '√': 0.3762,
    x: 0.3682,
    cursor: -0.3617,
    る: -0.3558,
    '?': -0.3237,
    U: 0.319,
    ';': -0.3011,
    '‚': -0.2961,
    T: -0.2879,
    u: 0.2737,
    ': ': 0.2733,
    传: -0.2723,
    置: -0.2717,
    換: -0.2671,
    Y: 0.2653,
    동: -0.265,
    으: -0.2634,
    い: -0.2624,
    '🔱  ': -0.261,
    '。': -0.2608,
    V: -0.2591,
    E: -0.2503,
    く: -0.2429,
    I: -0.2429,
    º: -0.2416,
    '🥬  ': -0.2324,
    ん: -0.218,
    h: -0.2178,
    得: -0.2164,
    s: -0.2162,
    '¨': -0.2154,
    '🔗  ': -0.2141,
    '“': -0.2117,
    '>📜  ': -0.2105,
    に: -0.2101,
    U0001faa8: -0.2073,
    배: -0.2069,
    줄: -0.2069,
    을: -0.2068,
    '２': -0.2067,
    를: -0.2065,
    합: -0.2065,
    고: -0.2063,
    서: -0.2062,
    무: -0.206,
    는: -0.2041,
    ビ: -0.2036,
    凶: -0.2035,
    함: -0.2031,
    체: -0.203,
    ã: -0.2029,
    K: -0.2022,
    i: 0.1977,
    m: 0.1901,
    w: 0.1899,
    C: -0.1885,
    H: -0.1882,
    '\n': 0.1779,
    $: -0.1764,
    d: 0.1709,
    '<': 0.1641,
    Ð: -0.1639,
    å: -0.1587,
    '"': -0.153,
    g: -0.1498,
    O: -0.148,
    o: 0.1149,
    v: 0.1131,
    ' ': 0.1073,
    _: 0.102,
    '(': 0.0959,
    Q: 0.0933,
    G: -0.0892,
    L: -0.0822,
    ',': 0.0819,
    q: 0.0803,
    '|': 0.0778,
    n: 0.0727,
    j: -0.0724,
    a: 0.0694,
    l: 0.0655,
    M: 0.0615,
    y: -0.0585,
    b: -0.0551,
    p: -0.0506,
    A: -0.0354,
    k: 0.0328,
    t: -0.029,
    F: 0.0265,
    c: -0.0172,
    e: 0.017,
    r: 0.0079,
    数: 0.0003,
}

const osMap: Record<string, number> = {
    'Mac OS X': 0.3885,
    win32: 0.3401,
}

const triggerTypeCoefficientMap: Record<string, number> = {
    IdleTime: -1.5242,
    IntelliSenseAcceptance: -1.0942,
    SpecialCharacters: -0.8414,
}

const lineNumCoefficient = -1.2497
const cursorOffsetCoefficient = -0.3617

// length of the current line of left_context
const lengthOfLeftCurrentCoefficient = -1.8837

// length of the previous line of left context
const lengthOfLeftPrevCoefficient = -0.4205

// lenght of right_context
const lengthofRightCoefficient = -0.6022

// classifier threshold
// const threshold = 0.5

// coefficient and intercept of logistic regression classifier
const intercept = 0.59138195

const maxCursorOffset = 2569748

const maxLineNum = 32224

const maxLengthOfLeftCurrent = 10240

const maxLengthOfLeftPrev = 10239

const maxLengthofRight = 10240

export const getShouldTrigger = (
    leftContext: string,
    rightContext: string,
    os: string,
    triggerType: string | undefined,
    char: string,
    lineNum: number,
    cursorOffset: number,
    triggerThreshold: number
) => {
    const leftContextLines = leftContext.split(/\r?\n/)
    const lengthOfLeftCurrent = leftContextLines[leftContextLines.length - 1].length
    const lengthOfLeftPrev = leftContextLines[leftContextLines.length - 2]?.length ?? 0
    const lengthofRight = rightContext.trim().length
    const triggerTypeCoefficient = triggerTypeCoefficientMap[triggerType || ''] ?? 0
    const osCoefficient = osMap[os] ?? 0
    const charCoefficient = characterCoefficientMap[char] ?? 0
    const result =
        lengthofRight * (lengthofRightCoefficient / maxLengthofRight) +
        lengthOfLeftCurrent * (lengthOfLeftCurrentCoefficient / maxLengthOfLeftCurrent) +
        lengthOfLeftPrev * (lengthOfLeftPrevCoefficient / maxLengthOfLeftPrev) +
        lineNumCoefficient * (lineNum / maxLineNum) +
        cursorOffsetCoefficient * (cursorOffset / maxCursorOffset) +
        osCoefficient +
        triggerTypeCoefficient +
        charCoefficient +
        intercept

    const shouldTrigger = sigmoid(result) > triggerThreshold
    return shouldTrigger
}

const sigmoid = (x: number) => {
    return 1 / (1 + Math.exp(-x))
}
