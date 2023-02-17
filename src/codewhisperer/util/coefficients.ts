/*!
 * Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/naming-convention */

// last character of left_context
const characterCoefficientMap: Record<string, number> = {
    '¸': 2.0063,
    8: -1.5715,
    '\\': -1.3954,
    0: -1.2774,
    7: -1.2258,
    6: -1.1688,
    '#': -1.1674,
    B: 1.0003,
    x: 0.8337,
    '/': -0.789,
    '\n': 0.7799,
    $: -0.7465,
    '<': 0.7256,
    f: 0.7225,
    U: 0.7122,
    u: 0.7005,
    '*': -0.6976,
    9: -0.6818,
    ':': 0.6803,
    '}': -0.6759,
    5: -0.6708,
    '`': -0.6603,
    ' ': 0.649,
    w: 0.6024,
    v: 0.5886,
    1: -0.575,
    d: 0.5676,
    2: -0.5613,
    m: 0.5482,
    M: 0.5322,
    o: 0.519,
    '>': -0.5108,
    Y: 0.5079,
    U0001faa8: -0.5041,
    ',': 0.4969,
    é: 0.4925,
    k: 0.4895,
    i: 0.4842,
    G: 0.4765,
    X: 0.4713,
    y: 0.4548,
    e: 0.4432,
    '√': 0.442,
    ß: -0.4345,
    数: 0.4341,
    n: 0.4339,
    '~': -0.4303,
    'Ⓡ': 0.4277,
    4: -0.4256,
    ｎ: 0.4224,
    ą: 0.4176,
    Z: -0.41,
    ö: 0.4019,
    a: 0.3941,
    h: 0.389,
    t: 0.3803,
    l: 0.3787,
    ';': -0.3759,
    r: 0.3742,
    _: 0.3644,
    b: 0.3626,
    '|': 0.3553,
    c: 0.3326,
    H: 0.323,
    '∏': -0.3158,
    の: -0.3126,
    '^': -0.3111,
    '"': 0.3092,
    '(': 0.3092,
    ')': -0.3044,
    '€': -0.2988,
    ã: -0.2945,
    p: 0.2873,
    g: 0.2827,
    J: 0.2817,
    Q: 0.2813,
    D: -0.2802,
    '%': -0.2697,
    면: -0.2684,
    V: -0.2615,
    ']': -0.2514,
    '-': -0.2293,
    置: -0.2241,
    い: -0.2228,
    '🔱': -0.2227,
    '\xa0': 0.2173,
    ㅇ: -0.2159,
    '。': -0.2142,
    ト: -0.2138,
    P: -0.2117,
    ん: -0.2056,
    す: -0.2053,
    L: 0.2043,
    容: -0.2028,
    줄: -0.2006,
    s: 0.2004,
    加: -0.1986,
    症: -0.1978,
    고: -0.1966,
    成: -0.1966,
    理: -0.1956,
    得: -0.1952,
    W: -0.1948,
    삿: -0.1947,
    '🥬': -0.1945,
    ㅅ: -0.1944,
    K: -0.1942,
    る: -0.1914,
    '”': -0.1914,
    '¿': -0.1899,
    N: -0.185,
    ṇ: -0.1842,
    미: -0.1778,
    F: 0.1758,
    '.': -0.1742,
    T: 0.1704,
    '[': -0.1663,
    å: -0.1565,
    "'": 0.1564,
    '💻': -0.1561,
    で: -0.155,
    '≈': -0.1542,
    j: 0.1541,
    무: -0.1525,
    오: -0.1524,
    능: -0.1521,
    합: -0.151,
    '£': -0.1481,
    '@': -0.1385,
    E: 0.1362,
    Д: -0.1268,
    q: 0.126,
    C: 0.1043,
    O: -0.0961,
    z: -0.0944,
    '!': 0.0869,
    '=': 0.0853,
    S: 0.078,
    '&': -0.0752,
    A: 0.0676,
    '{': 0.0505,
    3: -0.0356,
    '+': -0.0123,
    '?': 0.0081,
    I: 0.0078,
    R: -0.0068,
}

const osMap: Record<string, number> = {
    'Mac OS X': 0.1961,
    win32: 0.1179,
}

const triggerTypeCoefficientMap: Record<string, number> = {
    IntelliSenseAcceptance: 0.261,
    SpecialCharacters: 0.717,
    Enter: 0.9836,
}

const lineNumCoefficient = 0.9397
const cursorOffsetCoefficient = -0.7412

// length of the current line of left_context
const lengthOfLeftCurrentCoefficient = -1.5698

// length of the previous line of left context
const lengthOfLeftPrevCoefficient = 0.4191

// lenght of right_context
const lengthofRightCoefficient = -0.5587

// classifier threshold
// const threshold = 0.5

// intercept of logistic regression classifier
const intercept = -0.87383181

const maxCursorOffset = 94228

const maxLineNum = 2250

const maxLengthOfLeftCurrent = 177

const maxLengthOfLeftPrev = 152

const maxLengthofRight = 10239

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
