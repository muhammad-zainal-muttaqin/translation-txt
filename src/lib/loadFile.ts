import { detectFormat } from './format'
import { validateFile } from './validation'
import type { FileState, ValidationIssue } from '../types'

export const ALLOWED_EXTENSIONS = ['.txt', '.csv', '.md', '.json', '.log', '.srt', '.vtt', '.xml', '.yaml', '.yml']

export interface LoadedFile {
  fileState: FileState
  issues: ValidationIssue[]
}

export async function readFileForWorkspace(selectedFile: File): Promise<LoadedFile> {
  const content = await selectedFile.text()
  const lineCount = content.split('\n').length
  const format = detectFormat(selectedFile.name, content)

  const fileState: FileState = {
    name: selectedFile.name,
    format,
    size: selectedFile.size,
    lineCount,
    content,
  }

  const validation = validateFile(fileState)
  return { fileState, issues: validation.issues }
}
