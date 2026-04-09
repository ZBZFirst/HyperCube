# LLM Screening

`pubmed_data.csv` already contains the fields needed for first-pass screening:

- `ResearchQuestion`
- `Title`
- `Abstract`

The next-stage script is [`screenPubMedCsv.mjs`](/home/paulwasthere/AndroidStudioProjects/HyperCube-main/screenPubMedCsv.mjs). It reads a CSV in that format, sends each row to an LM Studio OpenAI-compatible endpoint, and writes a new CSV with appended screening columns.

## Run

```bash
cd /home/paulwasthere/AndroidStudioProjects/HyperCube-main
node screenPubMedCsv.mjs --input pubmed_data.csv --limit 5
```

Default endpoint:

```text
http://192.168.68.82:1234/v1/chat/completions
```

Override endpoint or model if needed:

```bash
node screenPubMedCsv.mjs \
  --input pubmed_data.csv \
  --output pubmed_data.screened.csv \
  --endpoint http://127.0.0.1:1235/v1/chat/completions \
  --model qwen2.5-3b-instruct
```

## Output Columns

The script appends:

- `LlmStatus`
- `LlmFitForReview`
- `LlmSummary256`
- `LlmReason`
- `LlmInvalidKind`
- `LlmReceivedText`
- `LlmModel`
- `LlmEndpoint`
- `LlmScreenedAt`
- `LlmError`

## Screening Contract

The script treats:

- `ResearchQuestion` as the restrictive inclusion criterion
- `Title` and `Abstract` as the evidence

It does not use the PubMed search query as inclusion evidence. That keeps retrieval and eligibility screening separate.
