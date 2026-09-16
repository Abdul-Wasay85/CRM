import * as XLSX from 'xlsx'

export type SpreadsheetRow = Record<string, string>

export type ParsedSpreadsheet = {
  headers: string[]
  rows: SpreadsheetRow[]
  sheetName: string
}

function cleanHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function cleanCell(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value).trim()
}

export async function parseSpreadsheet(
  file: File
): Promise<ParsedSpreadsheet> {
  const extension = file.name
    .split('.')
    .pop()
    ?.toLowerCase()

  if (
    extension !== 'csv' &&
    extension !== 'xlsx' &&
    extension !== 'xls'
  ) {
    throw new Error(
      'Unsupported file type. Please upload CSV, XLSX, or XLS.'
    )
  }

  const buffer = await file.arrayBuffer()

  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
  })

  if (!workbook.SheetNames.length) {
    throw new Error('The spreadsheet does not contain any sheets.')
  }

  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]

  const rawRows = XLSX.utils.sheet_to_json<
    Record<string, unknown>
  >(worksheet, {
    defval: '',
    raw: false,
  })

  if (!rawRows.length) {
    throw new Error(
      'The spreadsheet does not contain any data rows.'
    )
  }

  const originalHeaders = Object.keys(rawRows[0] ?? {})

  const headers = originalHeaders.map(cleanHeader)

  const rows: SpreadsheetRow[] = rawRows.map((rawRow) => {
    const row: SpreadsheetRow = {}

    originalHeaders.forEach(
      (originalHeader, index) => {
        const normalizedHeader =
          headers[index]

        row[normalizedHeader] =
          cleanCell(rawRow[originalHeader])
      }
    )

    return row
  })

  return {
    headers,
    rows,
    sheetName,
  }
}