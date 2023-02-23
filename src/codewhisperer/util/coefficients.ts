/*!
 * Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as vscode from 'vscode'

/* eslint-disable @typescript-eslint/naming-convention */

const keyWordCoefficientMap: Record<string, number> = {
    lambda: 1.5598,
    continue: -1.1504,
    elif: 1.0835,
    break: -1.0552,
    except: 1.0539,
    try: -0.8254,
    raise: 0.7434,
    else: -0.7266,
    def: 0.672,
    global: 0.6611,
    for: 0.5782,
    del: 0.5464,
    None: 0.5268,
    assert: 0.5245,
    pass: -0.4506,
    return: 0.4136,
    class: -0.1681,
    finally: -0.2231,
    yield: 0.2196,
    or: 0.4103,
    from: -0.3721,
    if: 0.3485,
    with: 0.3431,
    False: 0.3123,
    import: -0.306,
    is: 0.2942,
    as: 0.1591,
    not: 0.0829,
    await: -0.1381,
    while: 0.1293,
    in: -0.1099,
    and: 0.0515,
    True: 0.0055,
}

// last character of left_context
const characterCoefficientMap: Record<string, number> = {
    '¸': 1.9577,
    '8': -1.5466,
    '\\': -1.4011,
    '0': -1.2933,
    '7': -1.1974,
    '6': -1.1655,
    '#': -1.154,
    B: 1.0183,
    x: 0.8349,
    '/': -0.7983,
    '\n': 0.7597,
    $: -0.724,
    '<': 0.7179,
    U: 0.7146,
    '*': -0.7117,
    u: 0.7027,
    '}': -0.6882,
    '5': -0.685,
    '9': -0.6784,
    ':': 0.6759,
    '`': -0.6566,
    ' ': 0.6141,
    w: 0.6045,
    v: 0.5868,
    '1': -0.5784,
    m: 0.5777,
    '2': -0.5715,
    d: 0.5698,
    f: 0.5513,
    M: 0.5395,
    o: 0.5253,
    k: 0.5246,
    '>': -0.5097,
    Y: 0.4996,
    i: 0.4897,
    ',': 0.487,
    G: 0.481,
    last_char_U0001faa8: -0.4802,
    y: 0.4787,
    é: 0.4665,
    X: 0.4591,
    e: 0.4404,
    '4': -0.4346,
    '√': 0.4196,
    n: 0.4168,
    ß: -0.4148,
    数: 0.414,
    '~': -0.4117,
    'Ⓡ': 0.4075,
    ｎ: 0.4031,
    ą: 0.3988,
    Z: -0.3927,
    ';': -0.3865,
    ö: 0.3833,
    a: 0.3825,
    h: 0.38,
    l: 0.3781,
    _: 0.372,
    t: 0.3651,
    b: 0.3616,
    r: 0.3593,
    '|': 0.3418,
    c: 0.3356,
    H: 0.321,
    ')': -0.319,
    '"': 0.3128,
    '(': 0.3056,
    '∏': -0.2989,
    '^': -0.2971,
    の: -0.2966,
    p: 0.295,
    g: 0.2938,
    D: -0.2887,
    '€': -0.2883,
    ã: -0.2804,
    J: 0.2727,
    '%': -0.2685,
    Q: 0.2669,
    면: -0.2621,
    V: -0.2618,
    ']': -0.2579,
    '-': -0.2357,
    P: -0.2196,
    s: 0.2127,
    '\xa0': 0.212,
    置: -0.2113,
    い: -0.2104,
    '🔱': -0.21,
    L: 0.2072,
    ㅇ: -0.2045,
    '。': -0.2023,
    ト: -0.2018,
    す: -0.194,
    ん: -0.1932,
    容: -0.192,
    줄: -0.1901,
    N: -0.1887,
    加: -0.1882,
    K: -0.1878,
    W: -0.1874,
    症: -0.1869,
    고: -0.1869,
    成: -0.1851,
    삿: -0.1844,
    理: -0.1843,
    ㅅ: -0.1842,
    得: -0.1838,
    '🥬': -0.1834,
    F: 0.182,
    '”': -0.1817,
    る: -0.1801,
    '¿': -0.1798,
    ṇ: -0.1748,
    '.': -0.1736,
    T: 0.173,
    미: -0.1689,
    '[': -0.1606,
    j: 0.1562,
    "'": 0.1562,
    å: -0.1487,
    '💻': -0.148,
    '≈': -0.1473,
    で: -0.1469,
    오: -0.1459,
    무: -0.1458,
    능: -0.1454,
    합: -0.1442,
    '£': -0.1401,
    E: 0.1395,
    '@': -0.1374,
    q: 0.1272,
    Д: -0.1212,
    C: 0.1071,
    z: -0.1004,
    O: -0.0993,
    '=': 0.0902,
    '!': 0.0826,
    S: 0.0791,
    '&': -0.0748,
    A: 0.0695,
    '{': 0.0332,
    '3': -0.0314,
    '+': -0.0153,
    R: -0.0081,
    I: 0.0061,
    '?': 0.0032,
}

const osMap: Record<string, number> = {
    'Mac OS X': 0.1976,
    win32: 0.1218,
}

const triggerTypeCoefficientMap: Record<string, number> = {
    IntelliSenseAcceptance: 0.2484,
    SpecialCharacters: 0.7272,
    Enter: 1.0221,
}

const lineNumCoefficient = 0.8574
const cursorOffsetCoefficient = -0.7121

// length of the current line of left_context
const lengthOfLeftCurrentCoefficient = -1.4879

// length of the previous line of left context
const lengthOfLeftPrevCoefficient = 0.4132

// lenght of right_context
const lengthofRightCoefficient = -0.5462

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
    const threshold =
        100 - (vscode.workspace.getConfiguration('aws.codewhisperer').get('classifierInvocationProbability') as number)
    const myRandom = randomIntegerBetween(0, 101)
    if (myRandom < threshold) {
        return
    }

    const leftContextLines = leftContext.split(/\r?\n/)
    const leftContextAtCurrentLine = leftContextLines[leftContextLines.length - 1]
    const tokens = leftContextAtCurrentLine.trim().split(' ')
    const keyword = tokens[tokens.length - 1]
    const lengthOfLeftCurrent = leftContextLines[leftContextLines.length - 1].length
    const lengthOfLeftPrev = leftContextLines[leftContextLines.length - 2]?.length ?? 0
    const lengthofRight = rightContext.trim().length
    const triggerTypeCoefficient = triggerTypeCoefficientMap[triggerType || ''] ?? 0
    const osCoefficient = osMap[os] ?? 0
    const charCoefficient = characterCoefficientMap[char] ?? 0
    const keyWordCoefficient = keyWordCoefficientMap[keyword] ?? 0
    const result =
        lengthofRight * (lengthofRightCoefficient / maxLengthofRight) +
        lengthOfLeftCurrent * (lengthOfLeftCurrentCoefficient / maxLengthOfLeftCurrent) +
        lengthOfLeftPrev * (lengthOfLeftPrevCoefficient / maxLengthOfLeftPrev) +
        lineNumCoefficient * (lineNum / maxLineNum) +
        cursorOffsetCoefficient * (cursorOffset / maxCursorOffset) +
        osCoefficient +
        triggerTypeCoefficient +
        charCoefficient +
        keyWordCoefficient +
        intercept

    const shouldTrigger = sigmoid(result) > triggerThreshold
    return shouldTrigger
}

const sigmoid = (x: number) => {
    return 1 / (1 + Math.exp(-x))
}

// min(inclusive); max(exclusive)
function randomIntegerBetween(min: number, max: number) {
    return Math.floor(Math.random() * (max - min) + min)
}
