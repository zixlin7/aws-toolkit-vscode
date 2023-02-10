/*!
 * Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
import * as fs from 'fs-extra'
import * as vscode from 'vscode'
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
    typeSimulation(fileContents, editor, editor.selection.end, typingSpeed, inputPath, outputPath)
})

const typeSimulation = (
    text: string,
    editor: vscode.TextEditor,
    end: vscode.Position,
    speed: number,
    inputPath: string,
    outputPath: string
) => {
    const charsToPauseOn = [',', '.', '!']

    const token = text.substring(0, 1)
    if (text.length == 0) {
        mapPrompt(inputPath, outputPath)
        return
    }
    text = text.slice(1, text.length)

    if (token == `\n` || token == `\r\n`) {
        end = new vscode.Position(end.line + 1, 0) //start of a new line
    }

    editor
        .edit(editbuilder => {
            editbuilder.insert(end, token)

            // move the cursor
            const newSelection = new vscode.Selection(end, end)
            editor.selection = newSelection
        })
        .then(() => {
            let timeout = speed

            // after a pause char (like a coma), take a breath
            if (charsToPauseOn.indexOf(token) != -1) {
                timeout += speed * 1.5
            }

            // increment the position
            end = new vscode.Position(end.line, end.character + token.length)
            setTimeout(() => {
                typeSimulation(text, editor, end, speed, inputPath, outputPath)
            }, timeout)
        })
}

export const mapPrompt = (inputFile: string, outputFile: string) => {
    const recommendations = JSON.parse(fs.readFileSync(outputFile).toString())
    const groundTruth = fs.readFileSync(inputFile, 'utf-8')
    const lines = groundTruth.split(/\r?\n/)
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
