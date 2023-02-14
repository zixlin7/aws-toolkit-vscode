/*!
 * Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import * as fs from 'fs-extra'
import * as vscode from 'vscode'
import { sleep } from '../../shared/utilities/timeoutUtils'
// import { ExtContext } from '../../shared/extensions'
import { Commands } from '../../shared/vscode/commands2'

export const startSimulation = Commands.declare('aws.codeWhisperer.simulate', () => async () => {
    const inputPath = vscode.workspace.getConfiguration('aws.codeWhisperer').get('simulationInput') as string
    const outputPath = vscode.workspace.getConfiguration('aws.codeWhisperer').get('simulationOutput') as string
    const typingSpeed = vscode.workspace.getConfiguration('aws.codeWhisperer').get('simulationTypingSpeed') as number
    if (!inputPath || typeof inputPath !== 'string') {
        return
    }

    const fileContents = fs.readFileSync(inputPath, 'utf-8')
    const cases = fileContents.split(/\r?\n/)
    const sampledCases = []
    for (let i = 0; i < cases.length; i++) {
        const sample = Math.random()
        if (sample > 0.5 && sampledCases.length < 200) {
            const content = JSON.parse(cases[i])
            sampledCases.push({ input: `${content.prompt}${content.groundtruth}` })
        }
        if (sampledCases.length >= 5) {
            break
        }
    }
    const fsExts = ['py', 'cs', 'ts', 'js', 'java']
    const fnames: string[] = []
    fsExts.forEach(async ext => {
        const fileName = inputPath.replace('.jsonl', `simulation${Date.now()}.${ext}`)
        fnames.push(fileName)
        fs.writeFileSync(fileName, '')
    })

    let doc: vscode.TextDocument

    if (inputPath.includes('javascript')) {
        doc = await vscode.workspace.openTextDocument(fnames[2])
    } else if (inputPath.includes('python')) {
        doc = await vscode.workspace.openTextDocument(fnames[0])
    } else if (inputPath.includes('java')) {
        doc = await vscode.workspace.openTextDocument(fnames[4])
    } else if (inputPath.includes('csharp')) {
        doc = await vscode.workspace.openTextDocument(fnames[1])
    } else {
        doc = await vscode.workspace.openTextDocument(fnames[3])
    }

    const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One, false)
    let i = 0
    while (i < 200) {
        const sample = sampledCases[i]
        await typeSimulation(sample.input, editor, typingSpeed, outputPath)
        i++
    }
})

const typeSimulation = async (text: string, editor: vscode.TextEditor, speed: number, outputPath: string) => {
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
    mapPrompt(text, outputPath)
}

export const mapPrompt = (truth: string, outputFile: string) => {
    const recommendations = JSON.parse(fs.readFileSync(outputFile).toString())
    const lines = truth.split(/\r?\n/)
    recommendations.forEach((reco: any) => {
        const numberOfLines = reco.recommendation.split(/\r?\n/).length as number
        const truthLines = []
        let i = reco.lineNumber as number
        while (i < (reco.lineNumber as number) + numberOfLines) {
            if (i === reco.lineNumber && reco.character) {
                const line = lines[i]
                const startingIndex = reco.character >= line.length ? line.length - 1 : reco.character
                truthLines.push(line.slice(startingIndex))
            } else {
                truthLines.push(lines[i])
            }
            i++
        }
        reco.groundTruth = truthLines.join('\n')
    })
    fs.writeFileSync(outputFile, JSON.stringify(recommendations))
}
