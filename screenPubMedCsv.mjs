#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_ENDPOINT =
  process.env.LM_STUDIO_ENDPOINT || 'http://192.168.68.82:1234/v1/chat/completions';
const DEFAULT_MODEL = process.env.LM_STUDIO_MODEL || 'qwen2.5-3b-instruct';
const DEFAULT_OUTPUT_SUFFIX = '.screened.csv';

const SYSTEM_PROMPT = [
  'You are performing first-pass eligibility screening for a literature review.',
  'The input article was already retrieved upstream by search terms; retrieval overlap is not evidence for inclusion.',
  'Use the research question as a restrictive filter, not as a broad thematic guide.',
  'Each concept in the research question narrows the candidate set. Added specificity subtracts from eligibility rather than expanding it.',
  'Use only explicit evidence from the title and abstract.',
  'Do not infer relevance from loose association, neighboring topics, shared vocabulary, analogy, or speculative reasoning.',
  'If the input is article-like and includes a title and/or abstract, return screened_article.',
  'Set fit_for_review to true only when the title and abstract clearly satisfy the research question as written.',
  'If support is incomplete, indirect, uncertain, or off-topic, return screened_article with fit_for_review set to false.',
  'Use invalid_input only for greetings, commands, empty input, or text that is not reasonably article-like.',
  'Return only JSON matching the provided schema.'
].join(' ');

const RESPONSE_SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'article_screening',
    strict: true,
    schema: {
      oneOf: [
        {
          type: 'object',
          properties: {
            status: { type: 'string', const: 'screened_article' },
            summary_256: { type: 'string', maxLength: 256 },
            fit_for_review: { type: 'boolean' },
            reason: { type: 'string' }
          },
          required: ['status', 'summary_256', 'fit_for_review', 'reason'],
          additionalProperties: false
        },
        {
          type: 'object',
          properties: {
            status: { type: 'string', const: 'invalid_input' },
            invalid_kind: {
              type: 'string',
              enum: [
                'greeting',
                'casual_chat',
                'question',
                'command',
                'empty_input',
                'incomplete_article',
                'non_article_text',
                'other'
              ]
            },
            received_text: { type: 'string' },
            reason: { type: 'string' }
          },
          required: ['status', 'invalid_kind', 'received_text', 'reason'],
          additionalProperties: false
        }
      ]
    }
  }
};

const SCREENING_HEADERS = [
  'LlmStatus',
  'LlmFitForReview',
  'LlmSummary256',
  'LlmReason',
  'LlmInvalidKind',
  'LlmReceivedText',
  'LlmModel',
  'LlmEndpoint',
  'LlmScreenedAt',
  'LlmError'
];

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(options.input);
  const outputPath = path.resolve(options.output || deriveOutputPath(inputPath));
  const csvText = await fs.readFile(inputPath, 'utf8');
  const rows = parseCsv(csvText);

  if (!rows.length) {
    throw new Error(`CSV is empty: ${inputPath}`);
  }

  const headers = rows[0];
  const dataRows = rows.slice(1).map(values => rowFromValues(headers, values));
  const totalRows = clampLimit(dataRows.length, options.limit);
  const rowsToProcess = dataRows.slice(0, totalRows);

  console.log(`Input: ${inputPath}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Endpoint: ${options.endpoint}`);
  console.log(`Model: ${options.model}`);
  console.log(`Rows to process: ${rowsToProcess.length}/${dataRows.length}`);

  const processedRows = await processRows(rowsToProcess, options);
  const combinedHeaders = appendMissingHeaders(headers, SCREENING_HEADERS);
  const outputCsv = serializeCsv(
    combinedHeaders,
    processedRows.map(row => combinedHeaders.map(header => row[header] ?? ''))
  );

  await fs.writeFile(outputPath, outputCsv, 'utf8');
  console.log(`Wrote screened CSV: ${outputPath}`);
}

function parseArgs(argv) {
  const options = {
    endpoint: DEFAULT_ENDPOINT,
    model: DEFAULT_MODEL,
    output: '',
    input: '',
    limit: 0,
    concurrency: 1
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--input' && next) {
      options.input = next;
      i += 1;
    } else if (arg === '--output' && next) {
      options.output = next;
      i += 1;
    } else if (arg === '--endpoint' && next) {
      options.endpoint = next;
      i += 1;
    } else if (arg === '--model' && next) {
      options.model = next;
      i += 1;
    } else if (arg === '--limit' && next) {
      options.limit = Number.parseInt(next, 10);
      i += 1;
    } else if (arg === '--concurrency' && next) {
      options.concurrency = Number.parseInt(next, 10);
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      printHelpAndExit();
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  if (!options.input) {
    throw new Error('Missing required --input argument');
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1) {
    throw new Error('--concurrency must be a positive integer');
  }
  if (!Number.isInteger(options.limit) || options.limit < 0) {
    throw new Error('--limit must be a non-negative integer');
  }

  return options;
}

function printHelpAndExit() {
  console.log(`Usage:
  node screenPubMedCsv.mjs --input pubmed_data.csv [--output screened.csv]
      [--endpoint http://192.168.68.82:1234/v1/chat/completions]
      [--model qwen2.5-3b-instruct] [--limit 10] [--concurrency 1]`);
  process.exit(0);
}

function deriveOutputPath(inputPath) {
  const ext = path.extname(inputPath);
  const base = ext ? inputPath.slice(0, -ext.length) : inputPath;
  return `${base}${DEFAULT_OUTPUT_SUFFIX}`;
}

function clampLimit(length, limit) {
  if (!limit) {
    return length;
  }
  return Math.min(length, limit);
}

async function processRows(rows, options) {
  const results = new Array(rows.length);
  let index = 0;

  async function worker() {
    while (index < rows.length) {
      const currentIndex = index;
      index += 1;
      const row = rows[currentIndex];
      console.log(`Screening row ${currentIndex + 1}/${rows.length}: PMID ${row.PMID || '(none)'}`);
      results[currentIndex] = await screenRow(row, options);
    }
  }

  const workers = Array.from({ length: options.concurrency }, () => worker());
  await Promise.all(workers);
  return results;
}

async function screenRow(row, options) {
  const title = (row.Title || '').trim();
  const abstract = (row.Abstract || '').trim();
  const researchQuestion = (row.ResearchQuestion || '').trim();

  if (!researchQuestion) {
    return withScreeningFields(row, {
      LlmStatus: 'invalid_input',
      LlmFitForReview: '',
      LlmSummary256: '',
      LlmReason: 'Missing ResearchQuestion in CSV row.',
      LlmInvalidKind: 'other',
      LlmReceivedText: title || abstract,
      LlmModel: options.model,
      LlmEndpoint: options.endpoint,
      LlmScreenedAt: new Date().toISOString(),
      LlmError: 'Missing ResearchQuestion'
    });
  }

  if (!title && !abstract) {
    return withScreeningFields(row, {
      LlmStatus: 'invalid_input',
      LlmFitForReview: '',
      LlmSummary256: '',
      LlmReason: 'Missing Title and Abstract in CSV row.',
      LlmInvalidKind: 'empty_input',
      LlmReceivedText: '',
      LlmModel: options.model,
      LlmEndpoint: options.endpoint,
      LlmScreenedAt: new Date().toISOString(),
      LlmError: 'Missing Title and Abstract'
    });
  }

  try {
    const payload = buildPayload(row, options);
    const response = await fetch(options.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HTTP ${response.status}: ${body}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = parseModelContent(content);
    return withScreeningFields(row, mapScreeningResponse(parsed, options));
  } catch (error) {
    return withScreeningFields(row, {
      LlmStatus: '',
      LlmFitForReview: '',
      LlmSummary256: '',
      LlmReason: '',
      LlmInvalidKind: '',
      LlmReceivedText: '',
      LlmModel: options.model,
      LlmEndpoint: options.endpoint,
      LlmScreenedAt: new Date().toISOString(),
      LlmError: error.message
    });
  }
}

function buildPayload(row, options) {
  const userMessage = [
    `ResearchQuestion: ${String(row.ResearchQuestion || '').trim()}`,
    `Title: ${String(row.Title || '').trim()}`,
    `Abstract: ${String(row.Abstract || '').trim()}`
  ].join('\n\n');

  return {
    model: options.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage }
    ],
    response_format: RESPONSE_SCHEMA,
    temperature: 0,
    stream: false
  };
}

function parseModelContent(content) {
  if (typeof content === 'object' && content !== null) {
    return content;
  }
  if (typeof content !== 'string') {
    throw new Error(`Unexpected content type: ${typeof content}`);
  }
  return JSON.parse(content);
}

function mapScreeningResponse(parsed, options) {
  const now = new Date().toISOString();
  if (parsed.status === 'screened_article') {
    return {
      LlmStatus: parsed.status,
      LlmFitForReview: String(parsed.fit_for_review),
      LlmSummary256: parsed.summary_256 || '',
      LlmReason: parsed.reason || '',
      LlmInvalidKind: '',
      LlmReceivedText: '',
      LlmModel: options.model,
      LlmEndpoint: options.endpoint,
      LlmScreenedAt: now,
      LlmError: ''
    };
  }
  if (parsed.status === 'invalid_input') {
    return {
      LlmStatus: parsed.status,
      LlmFitForReview: '',
      LlmSummary256: '',
      LlmReason: parsed.reason || '',
      LlmInvalidKind: parsed.invalid_kind || '',
      LlmReceivedText: parsed.received_text || '',
      LlmModel: options.model,
      LlmEndpoint: options.endpoint,
      LlmScreenedAt: now,
      LlmError: ''
    };
  }
  throw new Error(`Unexpected screening status: ${parsed.status}`);
}

function withScreeningFields(row, screeningFields) {
  return { ...row, ...screeningFields };
}

function appendMissingHeaders(headers, extras) {
  const output = [...headers];
  for (const header of extras) {
    if (!output.includes(header)) {
      output.push(header);
    }
  }
  return output;
}

function rowFromValues(headers, values) {
  const row = {};
  headers.forEach((header, index) => {
    row[header] = values[index] ?? '';
  });
  return row;
}

function serializeCsv(headers, rows) {
  const csvRows = [headers.map(escapeCsvField).join(',')];
  for (const row of rows) {
    csvRows.push(row.map(escapeCsvField).join(','));
  }
  return `${csvRows.join('\n')}\n`;
}

function escapeCsvField(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char === '\r') {
      continue;
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter(parsedRow => parsedRow.some(value => value !== ''));
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
