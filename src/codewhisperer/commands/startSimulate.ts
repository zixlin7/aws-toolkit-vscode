/*!
 * Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import * as fs from 'fs-extra'
import * as fuzz from 'fuzzball'
import * as vscode from 'vscode'
import { sleep } from '../../shared/utilities/timeoutUtils'
// import { ExtContext } from '../../shared/extensions'
import { Commands } from '../../shared/vscode/commands2'
import { InlineCompletionService, RecommendationEntry } from '../service/inlineCompletionService'

interface CodeSnippet {
    input: string
    language: string
}

const statusBar: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left)

export const startSimulation = Commands.declare('aws.codeWhisperer.simulate', () => async () => {
    const inputPath = vscode.workspace.getConfiguration('aws.codeWhisperer').get('simulationInput') as string
    const outputPath = vscode.workspace.getConfiguration('aws.codeWhisperer').get('simulationOutput') as string
    const typingSpeed = vscode.workspace.getConfiguration('aws.codeWhisperer').get('simulationTypingInterval') as number
    const sampledSize = vscode.workspace.getConfiguration('aws.codewhisperer').get('simulationSampledSize') as number
    const sampler = vscode.workspace.getConfiguration('aws.codewhisperer').get('simulationSampler') as boolean

    if (!inputPath || typeof inputPath !== 'string') {
        return
    }

    const fileContents = fs.readFileSync(inputPath, 'utf-8')
    const cases = fileContents.split(/\r?\n/)
    const sampledCases: CodeSnippet[] = sampleData(cases, sampledSize, sampler)

    try {
        let results: RecommendationEntry[] = []

        for (let i = 0; i < sampledCases.length; i++) {
            const codeSample = sampledCases[i]
            statusBar.text = `Simulation: ${i + 1}/${sampledCases.length}`
            statusBar.show()
            // start typing and collect telemetry data
            await startTyping(codeSample, typingSpeed)

            // attach ground truth to the data collected from startTyping(...)
            const result = attachGroundTruth(codeSample.input, outputPath)
            results = [...results, ...result]
        }

        fs.writeFileSync(outputPath, JSON.stringify(results))
    } catch (e) {
        console.error(e)
    } finally {
    }
})

async function startTyping(codeCase: CodeSnippet, typingSpeed: number) {
    await vscode.workspace.openTextDocument({ language: codeCase.language }).then(async doc => {
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.One, false).then(async textEditor => {
            // open a temp document, start typing the content
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

const attachGroundTruth = (truth: string, outputFile: string) => {
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
        if (reco.groundTruth === reco.recommendation) {
            reco.isExactMatch = true
            reco.similarity = 1
        } else {
            reco.isExactMatch = false
            reco.similarity = calculateDistance(reco.groundTruth, reco.recommendation)
        }
    })

    return recommendations
}

function sampleData(cases: string[], sampledSize: number, randomSampler: boolean): CodeSnippet[] {
    const result: CodeSnippet[] = []

    if (randomSampler && sampledSize > 0 && sampledSize < cases.length) {
        sampledSize = Math.min(sampledSize, cases.length)

        const randomIndexes = new Set<number>()
        while (randomIndexes.size < sampledSize) {
            randomIndexes.add(randomIntegerBetween(0, cases.length))
        }
        randomIndexes.forEach(i => {
            const content = JSON.parse(cases[i])
            result.push({
                input: `${content.prompt}${content.groundtruth}`,
                language: content.metadata.source_metadata.identified_language as string,
            })
        })
    } else {
        let size: number
        if (sampledSize <= 0) {
            size = cases.length
        } else {
            size = Math.min(cases.length, sampledSize)
        }

        for (let i = 0; i < size; i++) {
            const content = JSON.parse(cases[i])
            result.push({
                input: `${content.prompt}${content.groundtruth}`,
                language: content.metadata.source_metadata.identified_language as string,
            })
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

// min(inclusive); max(exclusive)
function randomIntegerBetween(min: number, max: number) {
    return Math.floor(Math.random() * (max - min) + min)
}

const calculateDistance = (recommendation: string, truth: string) => {
    const ratio = fuzz.ratio(recommendation, truth)
    return ratio / 100
}
