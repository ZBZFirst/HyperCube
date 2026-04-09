# Project Summary

## Overview

This project supports an improved literature review workflow by combining:

- PubMed retrieval
- structured CSV generation
- first-pass AI screening

The result is a repeatable process that moves from search terms to a reviewable evidence table, and then from that evidence table to a preliminary inclusion assessment.

## What The Project Does

The HyperCube project begins by querying PubMed with user-defined search terms. It then retrieves article metadata and abstract content and normalizes the results into a structured CSV. That CSV includes the research question, search provenance, title, abstract, identifiers, authors, publication dates, MeSH terms, and keywords.

This structured output is important because it separates three things that are often mixed together in manual review:

- the search logic used to retrieve candidate papers
- the evidence contained in each article record
- the later judgment about whether the article fits the research question

By preserving those as separate fields, the dataset becomes reusable and auditable.

## Why This Improves Literature Review

Traditional literature review work often requires repeated manual scanning of titles and abstracts just to perform the first inclusion pass. That is time-intensive and difficult to repeat consistently across changing search terms or revised research questions.

This workflow improves the process by dividing the work into two stages:

1. retrieval for recall
2. screening for precision

The PubMed search step is designed to gather a candidate pool. The AI screening step is then used to review those candidates against the research question as written. This means the user can search broadly without having to manually hand-screen every row from scratch.

The output is not a final decision engine. It is a first-pass triage artifact. The researcher still reviews the screened CSV, but the repetitive preliminary work is reduced and the basis for each decision is preserved.

## Structured Data As The Handoff Layer

The key design principle is that the CSV is the handoff boundary.

The project’s structured data output is agnostic. It does not force an interpretation. Instead, it preserves the retrieved literature in a stable format so later stages can operate on the same evidence. In practical terms, the structured dataset allows the literature to speak for itself once it has been normalized into consistent rows.

Because the data layer is stable, the workflow can be reused on different review topics as long as the rows contain:

- `ResearchQuestion`
- `Title`
- `Abstract`

Everything after that can be iterated independently.

## Proposed AI Method

The proposed method uses a low-powered local AI model from the Qwen family to perform two narrow tasks on each article row:

- summarize the article abstract briefly
- classify whether the article appears fit for the research question

In the current implementation, the model used is:

- `qwen2.5-3b-instruct`

running through LM Studio on a separate machine on the local network.

This is an intentional design choice. A small local model is sufficient for first-pass work when the task is tightly structured. The model is not being asked to write a literature review, generate new knowledge, or synthesize long-form academic interpretation. It is being asked to perform bounded row-level operations against explicit inputs:

- the research question
- the article title
- the article abstract

That makes the problem narrow enough that a smaller Qwen-family model can be used as a practical screening tool.

## Why A Low-Powered Model Is Useful Here

Using a smaller local model has several practical advantages:

- low compute cost
- local control over the workflow
- repeatable batch processing across CSV rows
- no need to send article data to a remote commercial service
- faster iteration on prompts and classification rules

The method assumes that a low-powered model will not replace expert judgment. Instead, it reduces manual burden by handling the repetitive first pass:

- identify article-like input
- generate a short summary
- make a preliminary fit or non-fit decision
- provide a plain-language reason

This is a realistic role for a smaller model. It is not the final reviewer. It is the first-pass screener.

## Remote Launcher Mode

For larger CSV runs, the workflow can be made more efficient by moving the batch job onto the same machine that is already hosting LM Studio.

In the present setup, this was done with a small Windows batch launcher:

- `C:\Users\mailf\screening\run_ventwaveforms_remote.cmd`

That launcher is not a new compiled program. It is a plain text `.cmd` file whose only job is to:

1. enter the remote working directory
2. call the exact `node.exe` binary
3. run `screenPubMedCsv.mjs` against the local CSV on that machine
4. write a local output CSV and log file

This host-local pattern is better for overnight work because the coordinator laptop no longer has to stay involved in every row-level HTTP request. The inference host becomes both the model server and the batch worker.

## How The Screening Works

Each row from the CSV is sent to LM Studio with:

- the research question as the restrictive criterion
- the title and abstract as the evidence
- a structured JSON output schema

The model then returns a row-level screening result that is written back into a second CSV with appended fields such as:

- `LlmStatus`
- `LlmFitForReview`
- `LlmSummary256`
- `LlmReason`

This creates a reviewable artifact in which the original article data and the AI output stay together.

## Current Test Use Case

In the current test case, the workflow was run on a CSV generated from a PubMed search around drones and sea measurement. The system successfully:

- generated the structured CSV
- sent every row to the remote LM Studio model
- wrote a complete screened CSV with no transport failures

This demonstrates that the pipeline works end to end.

The main area still under refinement is prompt quality. The current low-powered model is capable of consistent summarization and classification output, but the inclusion logic needs further tuning so that it better matches the intended interpretation of the research question.

## Measured Performance In This Test

In this chat session, the full screening flow was executed against the remote LM Studio node for the complete test CSV.

Test data:

- 27 article rows
- input file: `pubmed_data.csv`
- output file: `pubmed_data.screened.full.csv`

Measured screening window from the generated CSV timestamps:

- first completed row: `2026-04-09T04:25:24.783Z`
- last completed row: `2026-04-09T04:30:36.739Z`
- elapsed screening time: about `312 seconds`

That is approximately:

- `5.2 minutes` total
- `11.6 seconds per row` on average
- about `5.2 rows per minute`

## Remote LM Studio Test Hardware

The LM Studio node used for this run was inspected over SSH and reported:

- CPU: `AMD Ryzen 5 5600G with Radeon Graphics`
- CPU cores: `6`
- CPU threads: `12`
- RAM: about `33.7 GB`
- graphics adapter: `AMD Radeon(TM) Graphics`

This is a practical lower-power local inference setup rather than a high-end dedicated AI workstation. That matters because it shows the workflow is usable without requiring expensive hardware.

## Why Better Hardware Changes The Workflow

Better hardware improves this process in two ways.

First, it reduces latency per row. Faster CPU inference, more memory bandwidth, or a stronger GPU can shorten the time required for each summarization and classification call. That means the same CSV can be screened faster and larger datasets become more practical.

Second, it makes concurrency more realistic. With stronger hardware, multiple chat-completion requests can be processed in parallel with less slowdown. In this workflow, that means several article rows could be screened at the same time instead of strictly one after another.

In practical terms:

- better single-request performance lowers the average seconds per row
- better multi-request capacity allows batch parallelization
- both improvements reduce total literature screening time

For this project, that means improved hardware does not change the data model or the review logic. It changes throughput. The same structured CSV workflow can scale more effectively as model-serving hardware improves.

## Practical Meaning

The current result is already useful because it demonstrates that a small Qwen-family model on modest local hardware can perform row-wise summarization and first-pass classification across a real CSV dataset in a matter of minutes.

With stronger hardware, the exact same method could:

- screen larger CSVs faster
- handle more complex prompts with less wait time
- support parallel row review
- make iterative prompt tuning much faster during research development

## Conclusion

This project demonstrates a practical method for improving literature review by combining structured retrieval with lightweight local AI screening.

HyperCube provides the search and data-structuring layer. LM Studio provides the row-wise screening layer. A low-powered Qwen-family model is used not as a final authority, but as a practical first-pass assistant for summarization and inclusion classification.

That combination makes the literature review process:

- more structured
- more repeatable
- easier to audit
- easier to iterate as research questions change
