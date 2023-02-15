/*!
 * Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import * as fs from 'fs-extra'
import * as vscode from 'vscode'
import { sleep } from '../../shared/utilities/timeoutUtils'
// import { ExtContext } from '../../shared/extensions'
import { Commands } from '../../shared/vscode/commands2'
import { InlineCompletion } from '../service/inlineCompletion'
import { InlineCompletionService, RecommendationEntry } from '../service/inlineCompletionService'

interface CodeSnippet {
    input: string
}

export const startSimulation = Commands.declare('aws.codeWhisperer.simulate', () => async () => {
    const inputPath = vscode.workspace.getConfiguration('aws.codeWhisperer').get('simulationInput') as string
    const outputPath = vscode.workspace.getConfiguration('aws.codeWhisperer').get('simulationOutput') as string
    const typingSpeed = vscode.workspace.getConfiguration('aws.codeWhisperer').get('simulationTypingSpeed') as number
    const sampledSize = vscode.workspace.getConfiguration('aws.codewhisperer').get('simulationSampledSize') as number

    if (!inputPath || typeof inputPath !== 'string') {
        return
    }

    const fileContents = fs.readFileSync(inputPath, 'utf-8')
    const cases = fileContents.split(/\r?\n/)
    const sampledCases: CodeSnippet[] = sampleData(cases, sampledSize)

    const mylanguage = checkLanguage(inputPath)

    if (mylanguage) {
        try {
            let results: RecommendationEntry[] = []

            for (const codeSample of sampledCases) {
                await collectData(codeSample, mylanguage, typingSpeed)
                const result = analyzeData(codeSample.input, outputPath)
                results = [...results, ...result]
            }

            fs.writeFileSync(outputPath, JSON.stringify(results))
        } finally {
            console.error('error')
        }
    }
})

async function collectData(codeCase: CodeSnippet, language: string, typingSpeed: number) {
    await vscode.workspace.openTextDocument({ language: language }).then(async doc => {
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.One, false).then(async textEditor => {
            await typeSimulation(codeCase.input, textEditor, typingSpeed)

            // done typing, clearing the document
            await textEditor.edit(builder => {
                builder.replace(new vscode.Range(new vscode.Position(0, 0), doc.positionAt(doc.getText().length)), '')
            })

            // done clearing, close the document
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor')
        })
    })
}

export const analyzeData = (truth: string, outputFile: string) => {
    const recommendations = InlineCompletionService.instance.flushRecommendationEntry()
    const lines = truth.split(/\r?\n/)
    recommendations.forEach(reco => {
        const numberOfLines = reco.recommendation.split(/\r?\n/).length as number
        const truthLines = []
        let i = reco.lineNumber as number

        // saveToJson(reco.recommendation, truth)
        // const endLine = Math.min((reco.lineNumber as number) + numberOfLines, lines.length)
        while (i < (reco.lineNumber as number) + numberOfLines && i < lines.length) {
            if (i === reco.lineNumber && reco.offset) {
                const line = lines[i]
                // console.log(line)
                const startingIndex = reco.offset >= line.length ? line.length - 1 : reco.offset
                truthLines.push(line.slice(startingIndex))
            } else {
                truthLines.push(lines[i])
            }
            i++
        }
        reco.groundTruth = truthLines.join('\n')
        reco.source = truth
    })

    return recommendations
}

function sampleData(cases: string[], sampledSize: number | undefined): CodeSnippet[] {
    const result: CodeSnippet[] = []

    if (sampledSize && sampledSize > 0) {
        sampledSize = Math.min(sampledSize, cases.length)

        const randomIndexes = new Set<number>()
        while (randomIndexes.size < sampledSize) {
            randomIndexes.add(randomIntegerBetween(0, cases.length))
        }
        randomIndexes.forEach(i => {
            const content = JSON.parse(cases[i])
            result.push({ input: `${content.prompt}${content.groundtruth}` })
        })
    } else {
        for (let i = 0; i < cases.length; i++) {
            const content = JSON.parse(cases[i])
            result.push({ input: `${content.prompt}${content.groundtruth}` })
        }
    }

    return result
}

const typeSimulation = async (text: string, editor: vscode.TextEditor, speed: number) => {
    let newEnd = new vscode.Position(0, 0)

    const tokens = text.split('')
    let i = 0
    while (i < tokens.length - 1) {
        const token = tokens[i]
        if (token == `\n` || token == `\r\n`) {
            newEnd = new vscode.Position(newEnd.line + 1, 0) //start of a new line
        }
        await editor.edit(editbuilder => {
            editbuilder.insert(newEnd, token)
            const newSelection = new vscode.Selection(newEnd, newEnd)
            editor.selection = newSelection
        })
        await sleep(speed)
        newEnd = new vscode.Position(newEnd.line, newEnd.character + token.length)
        i++
    }

    await editor.edit(editbuilder => {
        editbuilder.replace(new vscode.Range(new vscode.Position(0, 0), newEnd), '')
    })
}

const checkLanguage = (str: string) => {
    if (str.includes('javascript')) {
        return 'javascript'
    } else if (str.includes('python')) {
        return 'python'
    } else if (str.includes('java')) {
        return 'java'
    } else if (str.includes('csharp')) {
        return 'csharp'
    } else if (str.includes('typescript')) {
        return 'typescript'
    } else {
        new Error('can not map file name to corresponding language.........')
    }
}

function saveToJson(recommendation: string, truth: string) {
    const fileName = '/Users/xshaohua/Desktop/simulation/output/comparison.json'
    if (!fileName || typeof fileName !== 'string') {
        return
    }
    const newEntry = [
        {
            recommendation,
            truth,
        },
    ]
    if (fs.existsSync(fileName)) {
        const data = JSON.parse(fs.readFileSync(fileName, 'utf-8').toString())
        fs.writeFileSync(fileName, JSON.stringify([...data, ...newEntry]))
    } else {
        fs.writeFileSync(fileName, JSON.stringify(newEntry))
    }
}

// min(inclusive); max(exclusive)
function randomIntegerBetween(min: number, max: number) {
    return Math.floor(Math.random() * (max - min) + min)
}
