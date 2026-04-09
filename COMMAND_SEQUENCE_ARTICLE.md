# Command Sequence Article: API Choreography From PubMed Retrieval To Screened CSV

## Abstract

This article documents the command and API sequence used by HyperCube to transform a user-supplied research query into a final screened CSV suitable for first-pass literature review. The workflow is implemented as a staged command choreography rather than a monolithic application call. First, PubMed E-Utilities are invoked in sequence to identify candidate PMIDs, retrieve summary metadata, and fetch XML records containing abstracts, MeSH terms, and related identifiers. Second, the retrieved records are normalized into a stable CSV evidence table that preserves both search provenance and article content. Third, a Node screening command reads that CSV and submits each row to an LM Studio `/v1/chat/completions` endpoint with a restrictive system prompt and a JSON schema-based response contract. The final output is an augmented CSV containing model judgments and rationales. By documenting the exact sequencing of commands and API calls, this article clarifies how the pipeline achieves auditability, determinism, and reproducibility.

## PART I. QUESTION

The central technical question for this article is not whether the HyperCube pipeline works in a general sense, but how its commands and API calls are sequenced together to produce the final artifact. That question matters because reproducibility depends not only on code availability, but also on the order in which external services are called, the structure of intermediate outputs, and the boundaries between one stage of the workflow and the next.

In many research-adjacent automation systems, the command sequence is under-documented. A paper may state that records were retrieved from PubMed, processed by a language model, and written to a file, yet omit the specific choreography that connects those steps. When that happens, it becomes difficult to tell where provenance is preserved, where filtering is applied, where errors can arise, and which intermediate product should be treated as the source of record.

HyperCube avoids that ambiguity by separating the workflow into a retrieval sequence and a screening sequence. The retrieval sequence is responsible for building the evidence table. The screening sequence is responsible for generating row-wise model judgments from that evidence table. The final screened CSV depends on both, but the commands are intentionally not collapsed into a single opaque procedure.

The question this article addresses is therefore: what exact command order and API order produce the final screened CSV, and why is that order necessary? Answering that question makes the pipeline easier to audit, easier to rerun, and easier to compare against alternate implementations in future work.

## PART II. METHODS

The first sequence begins at the PubMed layer. In `pubmedFetcher.js`, the retrieval pipeline starts by calling NCBI E-Utilities `esearch.fcgi` with the database set to `pubmed`, the user’s search term encoded into the `term` parameter, `retmax=100000`, `retmode=json`, and the configured API key. The purpose of this first call is narrow: identify the PMID list for the broad candidate set. This stage does not fetch abstracts or detailed metadata. It returns identifiers.

Once the PMID list is obtained, HyperCube executes the second retrieval command sequence in batches of 50 IDs. For each batch, it calls `esummary.fcgi` with the joined PMID list and `retmode=json`. This produces title-level and citation-level metadata such as article title, source, publication date, and author objects. The code stores these records into an in-memory map keyed by PMID. At this point, the system has candidate identity and summary metadata, but not yet the full abstract and controlled-vocabulary terms needed for screening and downstream review.

The third retrieval sequence again operates in batches of 50 IDs, but now targets `efetch.fcgi` with `retmode=xml`. This call retrieves richer XML records. HyperCube parses the XML to extract abstract text, DOI, PMC identifier, full-text URLs, MeSH descriptor names, and author-provided keywords. These data are stored into a second PMID-keyed structure. The reason for separating `esummary` and `efetch` is practical: PubMed’s APIs expose different layers of information through different endpoints, so the retrieval stage must combine them explicitly.

After the three PubMed API sequences complete, HyperCube enters the normalization step. The command here is no longer an external API request but a local transformation. The metadata map from `esummary` and the tag-data map from `efetch` are merged row by row in `prepareData()`. Each output row receives fields such as `PMID`, `Title`, `Source`, `PubMedQuery`, author columns, publication date fragments, `Abstract`, `DOI`, `DOI_Link`, `PMC_ID`, `PMC_Link`, `MeSH_*`, and `Keyword_*`. These rows are then serialized by `convertToCSV()` into the evidence-table CSV. This file is the formal handoff object between retrieval and screening.

The screening sequence begins with a command-line invocation of the Node module:

```bash
node screenPubMedCsv.mjs --input pubmed_data.csv
```

Optional arguments allow the caller to override output path, model, endpoint, row limit, and concurrency. Operationally, the script performs a predictable command sequence on every row. First, it reads the CSV from disk. Second, it parses the header row and reconstructs each row object. Third, it validates the presence of `ResearchQuestion` and at least one of `Title` or `Abstract`. If required fields are missing, the script emits an `invalid_input`-style output row without calling the model.

If the row passes validation, the script constructs a chat-completions payload. The user message is assembled as a three-block text object containing `ResearchQuestion`, `Title`, and `Abstract`. A system prompt is added to instruct the model to use the research question as a restrictive filter, to use only title and abstract as evidence, and to avoid treating search overlap as proof of relevance. The payload then adds a `response_format` field containing a strict JSON schema. That schema requires the model to return either a `screened_article` object or an `invalid_input` object.

The actual inference call is an HTTP `POST` to the configured LM Studio endpoint, typically `http://192.168.68.82:1234/v1/chat/completions` or `http://127.0.0.1:1234/v1/chat/completions` when the batch is moved onto the model host. The payload includes `model`, `messages`, `response_format`, `temperature: 0`, and `stream: false`. Once the response arrives, the script extracts `choices[0].message.content`, parses the JSON, maps the returned fields into `LlmStatus`, `LlmFitForReview`, `LlmSummary256`, `LlmReason`, `LlmInvalidKind`, `LlmReceivedText`, `LlmModel`, `LlmEndpoint`, `LlmScreenedAt`, and `LlmError`, and appends those fields to the original row.

After all rows are processed, the script appends any missing screening headers to the original header set and serializes a final augmented CSV. This file is the final output artifact of the whole command sequence.

## PART III. RESULTS

The observed result of this command choreography is a stable multi-stage pipeline in which each step produces an intelligible intermediate or final product. The `esearch` call yields PMIDs, the `esummary` calls yield summary metadata, the `efetch` calls yield abstract-rich XML-derived content, the local normalization step yields a structured evidence table, and the LM Studio `POST` sequence yields row-wise screening annotations. At no point is the entire workflow reduced to a black box.

That explicit sequencing produced a complete screened CSV in the current test run. The input dataset contained 27 article rows associated with the research question “how do drones work at sea?” and a PubMed query around drones and sea measurement. The screening command processed all 27 rows and wrote a complete output file with appended model columns. No transport errors or schema-parsing failures were observed in the final CSV, which indicates that the command order, response contract, and file-serialization path were coherent for the tested batch.

The runtime characteristics also help validate the sequence design. Screening completed in approximately 312 seconds, or about 11.6 seconds per row. This confirms that the chosen choreography is operationally practical for small and medium first-pass batches on modest local hardware. Importantly, the time cost was concentrated in model inference rather than in the retrieval or serialization stages, which suggests that future throughput improvements will come mainly from hardware and concurrency rather than from changing the fundamental API order.

The current semantic outcome was conservative: all rows were classified as article-like, and all were marked not fit for review. That result points to prompt-quality limitations, but it does not undermine the command sequence itself. On the contrary, it demonstrates that the sequence is robust enough to produce a clean output artifact even when the prompt logic is still under revision.

## PART IV. DISCUSSION

The main value of documenting the command sequence is that it turns the pipeline into an auditable procedure rather than a narrative summary. Anyone reading the code or rerunning the workflow can now identify where retrieval happens, where enrichment happens, where normalization happens, where inference happens, and where final serialization happens. This matters for debugging, for scientific reporting, and for future automation work.

The sequencing also explains why the CSV is the correct handoff boundary. PubMed retrieval requires multiple external commands because no single endpoint returns every field needed for review. LM Studio screening requires repeated row-level commands because each article must be judged against the research question individually. The CSV sits between those two command families and provides a durable evidence table that can be checked, edited, archived, or resubmitted with a different model or prompt. If the system skipped that intermediate artifact, reproducibility would be weaker and error isolation would be harder.

The command sequence article also makes clear that the final output is not generated by one “AI command.” It is created by a composition of retrieval calls, local transforms, validation checks, schema-constrained inference calls, and final serialization. That is exactly the kind of detail that is often missing from high-level project summaries but is essential when turning a prototype into a defensible workflow.

Future work could extend this article by adding sequence diagrams, example request and response payloads, and batch-level error taxonomies. It could also compare LAN execution with host-local execution on the LM Studio machine, especially for overnight batches. Even without those additions, the present command-sequence account already provides a third documentation layer that complements the technical architecture article and the scientific methods article.

For that reason, a command sequence article is not optional overhead. It is the document that explains how the APIs and commands are actually composed to produce the final screened CSV, and it completes the paper set by making the workflow operationally explicit.
