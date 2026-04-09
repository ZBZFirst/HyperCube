---
name: run-pubmed-csv-screening
description: Use when working in HyperCube-main and the task is to take a structured PubMed-style CSV, send each row to the LM Studio model on the other computer, write an augmented screened CSV, and review the results. Best for CSVs shaped like pubmed_data.csv with ResearchQuestion, Title, and Abstract fields.
---

# Run Pubmed Csv Screening

## Overview

This skill runs HyperCube's row-wise literature screening flow against the remote LM Studio node and summarizes the resulting output CSV.

Use it when the user wants to:

- screen `pubmed_data.csv` or another similarly formatted CSV
- batch each row through the remote LM Studio model on `ztop`
- produce an output CSV with appended LLM fields
- review timing, fit counts, errors, and sample rows after the run

## Preconditions

Work from the real project source:

- `/home/paulwasthere/AndroidStudioProjects/HyperCube-main`

Primary files:

- input CSV: `/home/paulwasthere/AndroidStudioProjects/HyperCube-main/pubmed_data.csv`
- screening script: `/home/paulwasthere/AndroidStudioProjects/HyperCube-main/screenPubMedCsv.mjs`
- workflow docs: `/home/paulwasthere/AndroidStudioProjects/HyperCube-main/WORKFLOW_TO_LM_STUDIO.md`
- project summary: `/home/paulwasthere/AndroidStudioProjects/HyperCube-main/PROJECT_SUMMARY.md`
- research-style write-up: `/home/paulwasthere/AndroidStudioProjects/HyperCube-main/RESEARCH_STYLE_SUMMARY.md`

Remote node assumptions:

- SSH alias: `ssh ztop`
- LM Studio server: `http://192.168.68.82:1234`
- typical loaded model: `qwen2.5-3b-instruct`

If the user asks to verify the remote machine first, check:

- `ssh ztop "%USERPROFILE%\\.lmstudio\\bin\\lms.exe" status`
- `ssh ztop "%USERPROFILE%\\.lmstudio\\bin\\lms.exe" ps`
- `ssh ztop "%USERPROFILE%\\.lmstudio\\bin\\lms.exe" ls`

## Workflow

### 1. Inspect the CSV shape

Before running the batch, confirm the CSV contains the row-level evidence needed by the screener:

- `ResearchQuestion`
- `Title`
- `Abstract`

The screening script can tolerate extra columns. It appends LLM fields without removing the original data.

### 2. Run the screening script

Standard full run:

```bash
cd /home/paulwasthere/AndroidStudioProjects/HyperCube-main
node screenPubMedCsv.mjs \
  --input pubmed_data.csv \
  --output /tmp/pubmed_data.screened.full.csv
```

Use `--limit` for a small validation run:

```bash
node screenPubMedCsv.mjs \
  --input pubmed_data.csv \
  --output /tmp/pubmed_data.screened.test.csv \
  --limit 5
```

Override the endpoint or model only when the user explicitly wants a different target:

```bash
node screenPubMedCsv.mjs \
  --input pubmed_data.csv \
  --endpoint http://127.0.0.1:1235/v1/chat/completions \
  --model qwen2.5-3b-instruct
```

For long unattended jobs, prefer host-local execution on `ztop`:

1. copy the CSV and `screenPubMedCsv.mjs` to `C:\Users\mailf\screening`
2. launch a remote batch wrapper such as `run_ventwaveforms_remote.cmd`
3. target `http://127.0.0.1:1234/v1/chat/completions` on the remote machine

This reduces coordinator involvement and is the preferred overnight mode.

### 3. Review the output CSV

After the run, inspect:

- row count
- `LlmStatus`
- `LlmFitForReview`
- `LlmError`
- sample `LlmReason` values

Useful summary pattern:

```bash
python3 - <<'PY'
import csv
from collections import Counter
path = '/tmp/pubmed_data.screened.full.csv'
with open(path, newline='', encoding='utf-8') as f:
    rows = list(csv.DictReader(f))
print('rows=', len(rows))
print('status_counts=', dict(Counter(r['LlmStatus'] for r in rows)))
print('fit_counts=', dict(Counter(r['LlmFitForReview'] for r in rows)))
print('error_rows=', sum(1 for r in rows if r['LlmError']))
PY
```

If the user wants the file preserved in the repo, copy it into the project folder:

```bash
cp /tmp/pubmed_data.screened.full.csv \
  /home/paulwasthere/AndroidStudioProjects/HyperCube-main/pubmed_data.screened.full.csv
```

### 4. Report what matters

When closing out the task, summarize:

- which input CSV was screened
- which endpoint/model was used
- how many rows were processed
- how many rows were marked fit vs not fit
- whether there were parsing or transport errors
- whether prompt quality or model behavior looks like the main next issue

## Notes

The system prompt and JSON schema are part of the method, not incidental details. The screening script uses structured output so the model response can be parsed deterministically and written back into CSV columns. The final screened CSV is produced by mapping schema-valid JSON into tabular fields.

The current workflow is intended for first-pass screening, not final literature review judgment. Retrieval remains recall-oriented; the LLM step is a precision-oriented triage layer over the structured CSV.

## Failure Modes

If the run fails or behaves unexpectedly:

- verify the remote server is still up with `lms.exe status`
- verify the model is loaded with `lms.exe ps`
- confirm the input CSV still has `ResearchQuestion`, `Title`, and `Abstract`
- inspect whether `LlmError` is transport-related or prompt-related
- prefer fixing prompt logic before changing the data format if transport is already clean

## Resources

Use the project docs when the user wants background or write-ups:

- `/home/paulwasthere/AndroidStudioProjects/HyperCube-main/WORKFLOW_TO_LM_STUDIO.md`
- `/home/paulwasthere/AndroidStudioProjects/HyperCube-main/PROJECT_SUMMARY.md`
- `/home/paulwasthere/AndroidStudioProjects/HyperCube-main/RESEARCH_STYLE_SUMMARY.md`
