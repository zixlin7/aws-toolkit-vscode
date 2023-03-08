/*!
 * Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as vscode from 'vscode'
import { CodewhispererLanguage } from '../../shared/telemetry/telemetry'
import { KeyStrokeHandler } from '../service/keyStrokeHandler'
import { TelemetryHelper } from './telemetryHelper'

const performance = globalThis.performance ?? require('perf_hooks').performance

// os coefficient
const osMap: Record<string, number> = {
    'Mac OS X': 0.0836,
    win32: 0.0689,
    'Windows 10': 0.2915,
    'Windows 7': 0.0444,
}

// trigger type coefficient
const triggerTypeCoefficientMap: Record<string, number> = {
    IntelliSenseAcceptance: 0.1503,
    SpecialCharacters: -0.1977,
    Enter: 0.134,
}

const languageMap: Record<CodewhispererLanguage, number> = {
    python: 0.1205,
    java: 0,
    javascript: 0,
    csharp: 0,
    plaintext: 0,
    typescript: 0,
    tsx: 0,
    jsx: 0,
}

// other metadata coefficient
const lineNumCoefficient = 0.912

const cursorOffsetCoefficient = -1.2952

// length of the current line of left_context
const lengthOfLeftCurrentCoefficient = -0.9005

// length of the previous line of left context
const lengthOfLeftPrevCoefficient = 0.4311

// lenght of right_context
const lengthofRightCoefficient = -0.5218

const timeDiffCoefficient = -110.24

const lineDiffCoefficient = 0.0686

const prevDecisionAcceptCoefficient = 0.9947

const prevDecisionRejectCoefficient = -0.4026

const prevDecisionOtherCoefficient = -0.2435

const ideVscode = -0.0775

// intercept of logistic regression classifier
const intercept = -0.49550724

interface normalizedCoefficients {
    cursor: number
    lineNum: number
    lenLeftCur: number
    lenLeftPrev: number
    lenRight: number
    lineDiff: number
    timeDiff: number
}

const maxx: normalizedCoefficients = {
    cursor: 88911.0,
    lineNum: 1997.0,
    lenLeftCur: 164.0,
    lenLeftPrev: 160.0,
    lenRight: 10239.0,
    lineDiff: 349.0,
    timeDiff: 268602852.0,
}

const minn: normalizedCoefficients = {
    cursor: 0.0,
    lineNum: 0.0,
    lenLeftCur: 0.0,
    lenLeftPrev: 0.0,
    lenRight: 0.0,
    lineDiff: -32222.0,
    timeDiff: 0.0,
}

export const getShouldTrigger = (
    leftContext: string,
    rightContext: string,
    os: string,
    triggerType: string | undefined,
    char: string,
    lineNum: number,
    cursorOffset: number,
    triggerThreshold: number,
    language: CodewhispererLanguage | undefined
) => {
    if (!language) {
        return false
    }

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
    const charCoefficient = coefficients[char] ?? 0
    const keyWordCoefficient = coefficients[keyword] ?? 0
    const languageCoefficient = languageMap[language] ?? 0

    const prevoiusOneDecision = TelemetryHelper.instance.decisionQueue.mostRecentDecision()

    const previousOneAccept = prevoiusOneDecision === 'Accept' ? prevDecisionAcceptCoefficient : 0
    const previousOneReject = prevoiusOneDecision === 'Reject' ? prevDecisionRejectCoefficient : 0
    const previousOneOther =
        prevoiusOneDecision === 'Discard' ||
        prevoiusOneDecision === 'Empty' ||
        prevoiusOneDecision === 'Ignore' ||
        prevoiusOneDecision === 'Unseen' ||
        prevoiusOneDecision === 'Filter'
            ? prevDecisionOtherCoefficient
            : 0

    const timeDiff = KeyStrokeHandler.instance.lastInvocationTime
        ? performance.now() - KeyStrokeHandler.instance.lastInvocationTime
        : 0

    const lineDiff = KeyStrokeHandler.instance.lastInvocationLineNumber
        ? lineNum - KeyStrokeHandler.instance.lastInvocationLineNumber
        : 0

    const ideCoefficient = (vscode.workspace
        .getConfiguration('aws.codewhisperer')
        .get('simulationJetbrainsIde') as boolean)
        ? 0
        : ideVscode

    const result =
        (lengthofRightCoefficient * (lengthofRight - minn.lenRight)) / (maxx.lenRight - minn.lenRight) +
        (lengthOfLeftCurrentCoefficient * (lengthOfLeftCurrent - minn.lenLeftCur)) /
            (maxx.lenLeftCur - minn.lenLeftCur) +
        (lengthOfLeftPrevCoefficient * (lengthOfLeftPrev - minn.lenLeftPrev)) / (maxx.lenLeftPrev - minn.lenLeftPrev) +
        (lineNumCoefficient * (lineNum - minn.lineNum)) / (maxx.lineNum - minn.lineNum) +
        (cursorOffsetCoefficient * (cursorOffset - minn.cursor)) / (maxx.cursor - minn.cursor) +
        (timeDiffCoefficient * (timeDiff - minn.timeDiff)) / (maxx.timeDiff - minn.timeDiff) +
        (lineDiffCoefficient * (lineDiff - minn.lineDiff)) / (maxx.lineDiff - minn.lineDiff) +
        languageCoefficient +
        osCoefficient +
        triggerTypeCoefficient +
        charCoefficient +
        keyWordCoefficient +
        ideCoefficient +
        previousOneAccept +
        previousOneReject +
        previousOneOther +
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

const coefficients: Record<string, number> = {
    6: -1.6892,
    '\\': -1.6741,
    8: -1.5575,
    elif: 1.3813,
    '#': -1.2244,
    raise: 1.1775,
    break: -1.0436,
    protected: -1.0025,
    5: -0.9741,
    '(': 0.9513,
    continue: -0.9302,
    '*': -0.9026,
    '{': 0.8939,
    ':': 0.8849,
    lambda: 0.7899,
    '/': -0.7735,
    7: -0.7632,
    0: -0.7445,
    '`': -0.7365,
    cursor: -0.7298,
    throw: 0.7195,
    except: 0.712,
    '¸': 0.7115,
    case: 0.7087,
    '\n': 0.693,
    W: 0.6476,
    final: -0.6297,
    float: 0.6278,
    async: 0.6043,
    else: -0.5226,
    not: 0.5191,
    '!': -0.5183,
    pass: -0.5063,
    B: 0.5061,
    9: -0.4971,
    g: 0.4814,
    '[': 0.4793,
    ' ': 0.4758,
    $: -0.4737,
    u: 0.4701,
    z: -0.4639,
    i: 0.4426,
    ']': -0.4383,
    catch: -0.425,
    r: 0.4148,
    def: 0.4148,
    if: 0.4115,
    '≈': -0.4096,
    A: 0.3981,
    x: 0.3893,
    ';': -0.3865,
    y: 0.3846,
    '|': 0.3794,
    Z: -0.3786,
    J: 0.3741,
    4: -0.3653,
    1: -0.3639,
    e: 0.3532,
    this: -0.3487,
    w: 0.3436,
    t: 0.3421,
    '^': -0.3418,
    from: -0.341,
    '~': -0.3351,
    '№': -0.3316,
    n: 0.3307,
    o: 0.3216,
    G: 0.3186,
    abstract: -0.3164,
    '=': 0.3158,
    nonlocal: -0.3122,
    long: -0.3108,
    '<': 0.3038,
    for: 0.2974,
    '-': -0.2914,
    L: 0.2913,
    F: 0.2912,
    b: 0.2895,
    у: -0.2825,
    X: 0.2784,
    private: -0.2765,
    None: 0.2736,
    False: -0.2683,
    f: 0.2669,
    public: -0.2644,
    class: -0.2621,
    k: 0.2572,
    a: 0.2563,
    ',': 0.2525,
    l: 0.2485,
    '\xa0': 0.247,
    の: -0.2455,
    '√': 0.2435,
    I: 0.2424,
    m: 0.2412,
    M: 0.2408,
    h: 0.2383,
    do: -0.2377,
    while: 0.2354,
    del: -0.231,
    T: 0.223,
    ß: -0.2202,
    v: 0.2197,
    p: 0.2188,
    short: -0.2154,
    V: -0.2118,
    c: 0.2055,
    E: 0.2031,
    '?': 0.201,
    s: 0.198,
    new: 0.1942,
    录: 0.1935,
    O: 0.193,
    库: 0.1894,
    Y: 0.189,
    '}': -0.1878,
    C: 0.187,
    _: 0.1862,
    目: 0.1852,
    表: -0.1811,
    '，': -0.1805,
    2: -0.1795,
    价: -0.1792,
    in: -0.1766,
    权: 0.1765,
    d: 0.1756,
    锁: 0.1749,
    ｎ: 0.1745,
    '。': 0.1727,
    ó: 0.171,
    完: 0.1701,
    import: -0.1698,
    梯: -0.1659,
    '´': -0.1655,
    段: 0.1653,
    ㅇ: -0.1644,
    р: 0.1629,
    '【': 0.1621,
    编: 0.1619,
    char: 0.1592,
    super: -0.1587,
    '∏': -0.1578,
    '&': -0.1576,
    try: -0.1556,
    is: -0.1549,
    с: 0.1546,
    に: -0.1529,
    为: -0.1527,
    boolean: 0.151,
    and: -0.1504,
    병: 0.1482,
    global: -0.1444,
    3: 0.1424,
    D: -0.1402,
    static: -0.1399,
    double: 0.1336,
    息: -0.1304,
    True: -0.1294,
    U: 0.1282,
    '>': 0.1267,
    N: 0.1226,
    implements: 0.1213,
    할: -0.1185,
    as: -0.1181,
    H: 0.1127,
    ф: -0.1099,
    Q: 0.1065,
    ś: -0.1055,
    略: -0.1052,
    é: 0.1046,
    차: -0.104,
    і: -0.1037,
    代: -0.1011,
    Л: -0.1002,
    j: 0.0999,
    е: -0.0996,
    ㅅ: -0.0981,
    и: -0.0977,
    or: -0.0972,
    '！': -0.0971,
    extends: 0.0959,
    '＃': -0.0956,
    传: -0.0954,
    '🔱': -0.0951,
    ㅊ: -0.0936,
    订: -0.0923,
    щ: -0.0918,
    称: -0.091,
    void: 0.0909,
    个: -0.0903,
    回: -0.0903,
    며: -0.0902,
    签: -0.0898,
    미: -0.0896,
    換: -0.0895,
    의: -0.0892,
    商: 0.0885,
    成: -0.0879,
    '+': -0.0876,
    å: -0.087,
    '·': -0.0866,
    상: -0.0866,
    서: -0.0865,
    품: -0.0863,
    义: -0.0858,
    第: -0.0857,
    지: -0.0855,
    능: -0.0851,
    凶: -0.0846,
    한: -0.0843,
    '🌟': -0.0832,
    à: -0.0831,
    本: -0.082,
    값: -0.0818,
    す: -0.0815,
    布: -0.0808,
    instanceof: 0.0798,
    ｒ: -0.0797,
    入: -0.0795,
    求: -0.0773,
    尸: -0.0771,
    を: 0.0765,
    '"': 0.0764,
    行: -0.0762,
    る: -0.0753,
    查: -0.0742,
    细: -0.0725,
    return: -0.0714,
    '；': -0.0702,
    い: -0.0696,
    量: -0.0688,
    R: 0.0669,
    问: -0.0635,
    '.': 0.0596,
    byte: -0.0589,
    K: -0.0572,
    确: -0.0571,
    "'": 0.0542,
    然: -0.0541,
    체: -0.0523,
    Ω: -0.0516,
    package: 0.0512,
    态: -0.0506,
    ')': -0.0495,
    throws: -0.0494,
    '@': 0.049,
    '%': -0.0481,
    enum: 0.0369,
    S: -0.0344,
    await: 0.033,
    yield: -0.0326,
    P: -0.0319,
    default: 0.0283,
    with: -0.0274,
    synchronized: -0.0199,
    assert: 0.0176,
    q: 0.0166,
    数: -0.0142,
    int: 0.0101,
    据: -0.0094,
    interface: -0.003,
}
