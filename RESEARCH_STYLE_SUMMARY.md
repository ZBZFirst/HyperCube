# HyperCube and Local LLM-Assisted First-Pass Literature Screening

## Abstract

This project demonstrates an end-to-end workflow for early-stage literature review that combines PubMed retrieval, structured dataset generation, and local large language model (LLM) screening. The HyperCube system retrieves article candidates from PubMed using user-defined search terms, normalizes the results into a structured comma-separated values (CSV) file, and then submits each row to a locally hosted LLM through LM Studio for first-pass summarization and inclusion screening. In the present test configuration, a Qwen-family model, `qwen2.5-3b-instruct`, running on a separate workstation over the local network, was used to classify article rows against a research question. A full test run processed 27 rows in approximately 312 seconds, or about 11.6 seconds per row. The results show that modest local hardware can support a practical first-pass literature screening pipeline, while also indicating that prompt design remains the primary determinant of screening quality. The approach suggests that structured retrieval combined with lightweight local inference can improve the repeatability, auditability, and efficiency of literature review workflows.

## Introduction

Literature review is often slowed by the gap between article retrieval and article evaluation. Search engines such as PubMed are effective at producing candidate sets, but the resulting materials typically require substantial manual effort to normalize, inspect, and screen against a research question. This creates a bottleneck in the early review process, especially when search terms are intentionally broad in order to maximize recall.

The workflow described here addresses that bottleneck by separating retrieval from screening. HyperCube is used as the retrieval and structuring layer. It executes PubMed searches, collects metadata and abstracts, and writes a structured CSV that can be treated as a stable evidence table. A local LLM then operates on that structured output row by row, performing a first-pass review against the stated research question. The model is not used to replace the researcher’s judgment or to generate the review itself. Rather, it is used to automate repetitive preliminary tasks: brief summarization and tentative inclusion classification.

This division of labor is important. Retrieval remains recall-oriented, while screening becomes precision-oriented. The resulting process is more explicit and easier to iterate because the search logic, article evidence, and model judgment are kept separate.

## System Overview

The workflow consists of three main stages.

### Stage 1: PubMed Retrieval

HyperCube queries PubMed using user-specified search terms. The retrieval process gathers PubMed identifiers, metadata, abstracts, MeSH terms, keywords, and related identifiers such as DOI and PMC links.

### Stage 2: Structured Data Generation

The retrieved records are normalized into a structured CSV. Each row contains fields such as:

- `ResearchQuestion`
- `PubMedQuery`
- `PMID`
- `Title`
- `Abstract`
- author information
- publication date
- DOI and PMC references
- MeSH terms
- keywords

This CSV serves as the handoff boundary between retrieval and screening. It is intentionally agnostic. It preserves the literature as structured evidence rather than forcing an interpretation during retrieval.

### Stage 3: Local LLM Screening

A screening script reads the CSV and sends each row to an LM Studio endpoint using an OpenAI-compatible `/v1/chat/completions` interface. The model receives the research question, title, and abstract, and returns structured JSON containing:

- row status
- fit or non-fit judgment
- short summary
- explanation

The screening results are written back into an augmented CSV so that the original row data and the model’s output remain connected.

## Method

### Data Model

The core design principle is that screening should operate on explicit structured inputs rather than hidden workflow state. For each article row, the model is given:

1. the research question as the restrictive criterion
2. the title and abstract as the evidence

This allows the screening step to remain reusable across different topics, provided that the same column structure is maintained.

### Rationale for the Node `.mjs` Screening Script

The screening stage was implemented as a Node ECMAScript module, `screenPubMedCsv.mjs`, rather than as a Python script. This was a deliberate architectural choice rather than an incidental implementation detail.

The first reason is repository continuity. HyperCube already uses JavaScript for its retrieval and interface layers, so keeping the screening stage in the same language reduces cross-language maintenance and keeps the workflow easier to inspect as one coherent system. In practical terms, the same development environment, the same basic runtime family, and the same style of data handling can be used from PubMed retrieval through CSV generation and LLM handoff.

The second reason is deployment simplicity on the LM Studio host. The screening step only needs file I/O, CSV parsing, JSON handling, and HTTP requests to an OpenAI-compatible endpoint. Those needs are well served by a small Node script with no heavy scientific-computing dependencies. On the remote machine, the batch can be launched directly with Node from a Windows command wrapper, which makes unattended execution simpler than maintaining a separate Python environment with version and package requirements.

The third reason is architectural fit with the handoff boundary used in this project. The workflow is intentionally not a numerical-analysis pipeline. It is a structured data transport and controlled inference pipeline: read rows, assemble prompts, submit requests, parse schema-constrained JSON, and append fields back into CSV. That kind of event-driven orchestration maps naturally onto a lightweight JavaScript runtime and does not require Python-specific ecosystem advantages.

For this reason, the benefit of `.mjs` in the present workflow is not that JavaScript is universally superior to Python. The benefit is narrower and more practical: within a JavaScript-based HyperCube codebase and a Node-available LM Studio host, an `.mjs` screening script minimizes environment friction, preserves architectural consistency, and keeps the retrieval-to-screening pipeline easier to run and reproduce across machines.

### Proposed Use of a Low-Powered Local Model

The method intentionally uses a smaller model from the Qwen family, specifically `qwen2.5-3b-instruct`, for bounded row-level tasks. The model is not asked to perform full academic synthesis. Instead, it is used to:

1. generate a short summary of the abstract
2. make a preliminary judgment about whether the article fits the research question
3. provide a plain-language reason for that judgment

This constrained use case is well suited to a lower-powered local model because the task is narrow, repetitive, and structured. The objective is not maximal generative sophistication, but practical screening throughput on local hardware.

On the remote LM Studio node, the exact loaded model artifact was confirmed over SSH as:

- `Qwen2.5-3B-Instruct-GGUF/qwen2.5-3b-instruct-q4_k_m.gguf`

This matters for reproducibility because it identifies not only the model family, but the local quantized inference file actually used in testing.

### Prompting Strategy

The screening prompt was designed around a restrictive interpretation of the research question. The research question is treated as the inclusion criterion, while the title and abstract are treated as evidence. The search query itself is not treated as evidence of relevance, since retrieval and screening serve different functions.

The intended behavior is:

- article-like input should be recognized as screenable
- inclusion should be determined narrowly from the research question
- off-topic but article-like rows should still be classified as article rows, but marked not fit for review

The present experiments show that prompt wording strongly affects whether the model behaves conservatively, over-inclusively, or too literally.

### System Prompt and Structured Output

An important feature of the workflow is that the LLM step was not treated as an unconstrained chat. Instead, the screening call was built as a controlled inference contract with two explicit components:

1. a system prompt
2. a structured output schema

The system prompt defined the screening role. It instructed the model to behave as a first-pass eligibility screener for literature review rather than as a general conversational assistant. In practical terms, the prompt specified that:

- the research question should be treated as a restrictive filter
- the title and abstract should be treated as the evidence
- retrieval overlap from PubMed search terms should not be mistaken for inclusion evidence
- article-like rows should still be recognized as screenable even when not fit for the review question

This prompt framing was necessary because the model otherwise tended to behave inconsistently or to reason too broadly from neighboring concepts.

The second control layer was structured output through JSON schema. LM Studio supports structured responses on `/v1/chat/completions` when `response_format` is provided with a JSON schema. In this workflow, that schema constrained each model response into one of two valid objects:

- `screened_article`
- `invalid_input`

For `screened_article`, the required fields were:

- `status`
- `summary_256`
- `fit_for_review`
- `reason`

For `invalid_input`, the required fields were:

- `status`
- `invalid_kind`
- `received_text`
- `reason`

This design was critical for making the LLM usable in a CSV pipeline. Because the model was required to return JSON conforming to a schema, the screening script could parse `choices[0].message.content` deterministically and append the result into CSV columns without free-form cleanup. In other words, JSON functioned as the bridge between model inference and final tabular output.

That is one of the central methodological points of the project: the final screened CSV is not created by loosely interpreting chat text after the fact. It is created by enforcing a machine-readable response contract at inference time and then mapping the parsed JSON directly into appended CSV columns.

### Published Preset for Reproducibility

The prompt design was also connected to LM Studio preset infrastructure. On the remote LM Studio node, the preset files found under the local LM Studio Hub directory included:

- `@lmstudio-hub:paulwasthere/research-assistant`
- `@lmstudio-hub:paulwasthere/focused-research-assistant`

The user-provided public preset URL for later review and reproducibility was:

- `https://lmstudio.ai/paulwasthere/research-assistant`

This is significant because it means the screening behavior is not only embedded in the script. The prompting approach itself can be published, reviewed, revised, and re-imported as a reusable preset artifact. In principle, this improves reproducibility by making both the inference model and the prompt configuration inspectable.

## Test Configuration

### Test Corpus

The current test used a CSV derived from a PubMed search around drones and sea measurement. The research question in the CSV was:

`how do drones work at sea?`

The input file contained 27 structured article rows.

### Remote Inference Node

The model was hosted through LM Studio on a separate computer accessible over SSH and the local network. Hardware inspection of that machine reported:

- CPU: `AMD Ryzen 5 5600G with Radeon Graphics`
- cores: `6`
- logical processors: `12`
- RAM: approximately `33.7 GB`
- graphics adapter: `AMD Radeon(TM) Graphics`

This is a modest local inference environment rather than a specialized high-end AI server.

## Results

### End-to-End Execution

The workflow successfully completed the full pipeline:

1. retrieval data existed in structured CSV form
2. the CSV was read row by row
3. each row was submitted to the remote LM Studio model
4. a complete screened CSV was written with no transport errors

### Timing

The completed screening output recorded timestamps for each row. Based on those timestamps:

- first completed row: `2026-04-09T04:25:24.783Z`
- last completed row: `2026-04-09T04:30:36.739Z`
- total elapsed time: about `311.956 seconds`

For 27 rows, this corresponds to:

- approximately `5.2 minutes` total
- approximately `11.6 seconds per row`
- approximately `5.2 rows per minute`

### Screening Output

In the tested run:

- all 27 rows were recognized as `screened_article`
- all 27 rows were marked `fit_for_review = false`
- no rows produced transport or parsing errors

This indicates that the technical system functioned reliably, but that the prompt logic remained overly conservative for the chosen research question.

It is also important that no parsing failures occurred. The JSON schema and CSV-mapping approach worked as intended: every row produced a structured output that could be written back into tabular form.

## Discussion

### Value of the Workflow

The main contribution of this workflow is not that it automates literature review completely, but that it formalizes the early review stages into a repeatable system. HyperCube provides structured retrieval. LM Studio provides first-pass screening. The combined output is a reviewable artifact rather than an opaque model answer.

This makes the process more useful in several ways:

- it reduces repetitive manual title-and-abstract scanning
- it preserves provenance and reasoning in the output CSV
- it allows prompt iteration without rebuilding the retrieval step
- it keeps the human researcher in control of final inclusion decisions

### Role of the Data Layer

The structured CSV is the essential layer in this design. Because the dataset is agnostic, it can be reused across different screening rules and model configurations. In practical terms, this allows the evidence to remain visible and inspectable. The model’s role is secondary and layered on top of a stable corpus.

### Role of Hardware

The current test also shows that local hardware influences throughput rather than method. Better hardware would improve this system in two main ways.

First, stronger inference hardware would reduce latency per row. That would lower the average time required for each screening call and make larger datasets more practical.

Second, stronger hardware would make parallel request handling more feasible. If the host can process multiple chat completions concurrently, then several CSV rows can be screened at the same time. This would materially reduce total review time without requiring changes to the underlying data format.

Thus, improved hardware does not change the conceptual workflow. It changes scale and speed. The same retrieval-to-CSV-to-LLM process can become much faster as inference resources improve.

### Reproducibility Considerations

The present workflow has three reproducible components:

1. the structured retrieval dataset
2. the model artifact used for inference
3. the prompt/schema contract used for screening

The dataset is preserved in CSV form. The exact inference model can be named by its GGUF file. The prompting logic can be preserved either in the screening script or in a published LM Studio preset. This combination makes the workflow more reproducible than a conventional manual screening process, where intermediate reasoning and criteria are often not captured in machine-readable form.

### Current Limitation

The principal limitation observed in this experiment is prompt quality rather than infrastructure quality. The model produced stable structured output, but its interpretation of the research question was too strict or too literal for the test case. This suggests that future work should focus on refining screening prompts and possibly adding decision heuristics or human-in-the-loop review logic for borderline cases.

## Conclusion

This project demonstrates a practical, locally controlled method for first-pass literature screening. HyperCube generates a structured article dataset from PubMed. A Qwen-family local model hosted through LM Studio then performs row-level summarization and preliminary inclusion classification. In the present test, the full workflow processed 27 articles in about 5.2 minutes on modest hardware, showing that lightweight local AI can already support useful early-stage literature review tasks.

The primary benefit of the system is not final automation, but structured acceleration. It reduces manual burden, preserves evidence, and creates a repeatable screening artifact. With continued prompt refinement and stronger inference hardware, the same workflow could scale to faster and more useful review performance while remaining locally controlled and auditable.

## References To Project Artifacts

- [`pubmed_data.csv`](/home/paulwasthere/AndroidStudioProjects/HyperCube-main/pubmed_data.csv)
- [`pubmed_data.screened.full.csv`](/home/paulwasthere/AndroidStudioProjects/HyperCube-main/pubmed_data.screened.full.csv)
- [`screenPubMedCsv.mjs`](/home/paulwasthere/AndroidStudioProjects/HyperCube-main/screenPubMedCsv.mjs)
- [`WORKFLOW_TO_LM_STUDIO.md`](/home/paulwasthere/AndroidStudioProjects/HyperCube-main/WORKFLOW_TO_LM_STUDIO.md)
- [`PROJECT_SUMMARY.md`](/home/paulwasthere/AndroidStudioProjects/HyperCube-main/PROJECT_SUMMARY.md)
