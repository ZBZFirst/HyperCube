# Workflow To LM Studio

## Purpose

This project now supports an end-to-end early literature review workflow:

1. search PubMed using user-defined search terms
2. normalize the retrieved articles into a structured CSV
3. send each structured row to a local or remote LM Studio model
4. write back a first-pass inclusion judgment for later human review

The important design choice is that the CSV is the handoff boundary. The data produced by HyperCube is agnostic. It preserves the retrieved literature in a structured form so the evidence can be screened and interpreted later. The model does not create the corpus. It only performs a first-pass review on the corpus that already exists.

## What HyperCube Produces

The PubMed workflow in [`pubmedFetcher.js`](/home/paulwasthere/AndroidStudioProjects/HyperCube-main/pubmedFetcher.js) does three things:

1. runs the PubMed search
2. fetches metadata, abstracts, identifiers, MeSH terms, and keywords
3. converts the results into normalized row objects

The resulting CSV, shown in [`pubmed_data.csv`](/home/paulwasthere/AndroidStudioProjects/HyperCube-main/pubmed_data.csv), contains the fields needed for downstream review, especially:

- `ResearchQuestion`
- `PubMedQuery`
- `PMID`
- `Title`
- `Abstract`
- authors, publication date, DOI, PMC, MeSH, and keywords

Those fields matter because they separate:

- retrieval provenance: `PubMedQuery`
- review criterion: `ResearchQuestion`
- article evidence: `Title` and `Abstract`

That separation is what makes the next step stable.

## Why The Data Layer Matters

The CSV is not tied to one specific review topic. It is a reusable structured evidence table.

That means:

- a different CSV with the same column shape can be screened the same way
- the model can be changed without changing the retrieval format
- prompt logic can be refined without rebuilding the PubMed search step
- human review can happen after machine screening without losing the original evidence

In practice, the data is agnostic and lets the retrieved material speak for itself. The search results are preserved as structured evidence first; interpretation happens afterward.

## How HyperCube Hands Off To LM Studio

The LM Studio handoff is implemented in [`screenPubMedCsv.mjs`](/home/paulwasthere/AndroidStudioProjects/HyperCube-main/screenPubMedCsv.mjs).

That script:

1. reads an input CSV
2. extracts `ResearchQuestion`, `Title`, and `Abstract` from each row
3. builds a structured chat-completions request for LM Studio
4. sends that request to an OpenAI-compatible endpoint
5. parses the model response
6. appends screening fields to a new CSV

Default endpoint:

`http://192.168.68.82:1234/v1/chat/completions`

Default model:

`qwen2.5-3b-instruct`

The screening output columns are:

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

This creates a second CSV that preserves both the original article data and the model’s first-pass judgment.

## LM Studio In The Current Setup

In this test setup, LM Studio is running on the other computer on the network and is reachable at:

`192.168.68.82:1234`

We also verified over SSH that:

- the remote machine is accessible as `ssh ztop`
- LM Studio is serving on port `1234`
- the model in use is `qwen2.5-3b-instruct`

So the practical chain is:

1. HyperCube creates or exports a structured CSV
2. the screening script reads that CSV
3. each row is submitted to the remote LM Studio model
4. the output is written into a new screened CSV

## Remote-Host Run Mode

For longer overnight batches, the better pattern is to move orchestration onto the LM Studio machine itself instead of sending one HTTP request per row from the coordinator laptop.

In that mode:

1. copy the input CSV to the remote machine
2. copy the Node screening script to the remote machine
3. launch the batch on the remote machine against `http://127.0.0.1:1234/v1/chat/completions`
4. pull back only the finished screened CSV later

In the current setup, that remote launcher is:

- `C:\Users\mailf\screening\run_ventwaveforms_remote.cmd`

Its purpose is simple: it starts the Node screening script locally on the LM Studio host, points it at the local CSV file, and writes the output CSV and log file in the same remote working folder.

This is not a compiled executable. It is a plain Windows batch file that wraps the launch command in a more reliable form for `cmd.exe`, `start`, and Task Scheduler.

## Theoretical Use In The Current Test Case

The current test case uses:

- research question: `how do drones work at sea?`
- PubMed query: `drone sea measurement`

In this case, the system behaves as a two-stage review pipeline.

### Stage 1: Retrieval

PubMed search terms are used broadly to gather candidate articles. This is the recall-oriented step. It is intentionally willing to pull in nearby or loosely related papers so potentially useful articles are not missed.

### Stage 2: First-Pass Inclusion Review

The model then evaluates each article against the research question, not against the search query. This is the precision-oriented step. The question is treated as the restrictive filter, while the title and abstract are treated as the evidence.

For the test run, the full CSV was screened and written to:

[`/tmp/pubmed_data.screened.full.csv`](/tmp/pubmed_data.screened.full.csv)

The model marked every row as:

- `screened_article`
- `LlmFitForReview=false`

That result is useful even though the prompt still needs refinement. It shows that:

- the full technical flow works end to end
- the CSV structure is sufficient for row-wise LLM review
- the model can return consistent first-pass decisions into a reviewable artifact

It also reveals the current limitation:

- the present prompt is too strict or too literal for the test question and likely rejects borderline drone-at-sea use cases that a human might want to keep

So the workflow is functioning, while the inclusion logic still needs tuning.

## Practical Interpretation

The workflow should be understood as:

- HyperCube finds and structures the literature
- LM Studio performs a preliminary inclusion screen
- the researcher reviews the screened CSV, especially false negatives and borderline articles

This is not a final-review automation system. It is a repeatable first-pass triage system that reduces manual reading load and creates a durable audit trail for why articles were tentatively included or excluded.

## Recommended Next Step

The next improvement should focus on prompt quality, not data transport.

The data path is already working:

- PubMed search to CSV
- CSV to LM Studio
- LM Studio response back to screened CSV

The next iteration should refine how `LlmFitForReview` is decided for realistic research questions so the model becomes useful as a precision filter rather than an over-conservative rejector.
