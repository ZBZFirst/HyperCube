# Scientific Article: Local LLM-Assisted First-Pass Literature Screening With HyperCube

## Abstract

This article presents a local literature-screening workflow that combines PubMed retrieval, structured evidence-table generation, and row-wise large language model screening. HyperCube is used to retrieve article candidates and normalize them into a CSV containing search provenance, research question, title, abstract, identifiers, and related metadata. That CSV is then processed by a local screening script that submits each row to an LM Studio endpoint serving a compact Qwen-family model. The model is instructed to produce a structured judgment consisting of row status, review fit, summary, and rationale. In the current test run, 27 article rows were screened in approximately 312 seconds on modest local hardware, with no transport or parsing failures. All rows were classified as screenable articles, but all were marked not fit for the research question, indicating that the technical pipeline is stable while the prompt remains overly restrictive. The workflow demonstrates a reproducible and auditable first-pass triage method for early-stage literature review.

## PART I. QUESTION

Early literature review work is often slowed by a practical bottleneck: candidate papers can be retrieved quickly, but the first pass of reading titles and abstracts remains repetitive, inconsistent, and difficult to document in a reusable way. Search platforms such as PubMed can return a broad candidate pool, yet that output does not by itself produce a reviewable evidence table or a reproducible record of early inclusion judgments. The research question for this project is therefore whether a local workflow can support first-pass screening in a way that is structured, auditable, and practical on modest hardware.

The problem has two dimensions. The first is methodological. Retrieval and screening are often conflated. Search terms are used both to collect candidate papers and, informally, to justify whether those papers belong in the review. That creates confusion because broad retrieval is recall-oriented, while screening is precision-oriented. The second dimension is operational. Even when search results are available, researchers still need a mechanism for turning article metadata into a repeatable first-pass judgment without depending on opaque cloud tools or purely manual note-taking.

This study asks whether a two-stage pipeline can address that problem. In the first stage, HyperCube retrieves PubMed records and normalizes them into a structured CSV. In the second stage, a local large language model evaluates each row against the research question using only the title and abstract as evidence. The goal is not to automate final inclusion decisions or literature synthesis. The narrower goal is to determine whether a local LLM can provide useful row-wise summaries and tentative fit decisions that reduce manual workload while preserving an explicit audit trail.

The immediate test case used the research question, “how do drones work at sea?” together with a PubMed query around drones and sea measurement. This test was sufficient to examine both the technical behavior of the pipeline and the practical limitations of prompt-guided eligibility screening.

## PART II. METHODS

The workflow begins with PubMed retrieval through HyperCube. User-defined search terms are submitted to PubMed, and returned records are normalized into structured rows. Each row includes a research question, PubMed query provenance, title, abstract, identifiers such as PMID and DOI, publication information, and topic descriptors including MeSH terms and keywords. This normalized CSV acts as the handoff boundary between retrieval and screening.

That data-layer decision is important methodologically. The retrieval stage does not attempt to decide inclusion. It only produces a stable evidence table. Because the CSV preserves both search provenance and article content, the screening stage can operate later and independently. The same dataset can be re-screened with a different model, a different prompt, or a revised review criterion without needing to rebuild the retrieval corpus.

For screening, each row is processed by `screenPubMedCsv.mjs`, which sends a request to an LM Studio `/v1/chat/completions` endpoint. The request contains three essential inputs: the research question, the article title, and the article abstract. The system prompt instructs the model to treat the research question as a restrictive inclusion filter and the title and abstract as the only valid evidence. The PubMed search query is not treated as evidence for fit because retrieval overlap and review eligibility are intentionally separated.

The model response is constrained with a JSON schema. Each row must produce either a `screened_article` object or an `invalid_input` object. For screened articles, the required fields are status, summary, fit-for-review judgment, and reason. This structured output is then parsed and appended into new CSV columns. The design ensures that the output artifact is not a loose chat transcript but a reviewable table in which each article remains linked to its screening outcome.

The local model used in the present test was `qwen2.5-3b-instruct`, served through LM Studio on a separate workstation accessible over the local network. The exact loaded model artifact on the remote node was the GGUF variant `qwen2.5-3b-instruct-q4_k_m.gguf`. The use case was intentionally narrow. The model was not asked to synthesize a literature review or to generate new scientific claims. It was asked to perform bounded row-level tasks: summarize the abstract, determine whether the article fit the research question, and provide a short rationale for that judgment.

Hardware inspection of the remote host reported an AMD Ryzen 5 5600G with integrated Radeon graphics, 6 cores, 12 logical processors, and approximately 33.7 GB of RAM. This matters because the study was designed to test a practical local setup rather than a specialized AI server.

## PART III. RESULTS

The complete pipeline was executed successfully on a test CSV containing 27 article rows. HyperCube’s structured output was available as input to the screening stage, each row was submitted to the remote LM Studio model, and an augmented screened CSV was written without transport failure. The output file preserved the original article fields and added machine-generated screening fields including row status, fit-for-review decision, short summary, rationale, model name, endpoint, timestamp, and error field.

The timing data recorded in the screened CSV show that the first completed row was timestamped at `2026-04-09T04:25:24.783Z` and the last at `2026-04-09T04:30:36.739Z`. The total elapsed screening time was therefore approximately 311.956 seconds, which is about 5.2 minutes for the full batch. For 27 rows, that corresponds to approximately 11.6 seconds per row and about 5.2 rows per minute.

The most important positive result was structural reliability. All 27 rows were recognized as `screened_article`, and no rows failed because of malformed transport responses or schema-parsing errors. This indicates that the prompt-and-schema contract functioned as intended and that the row-wise CSV augmentation path was stable throughout the batch.

The principal negative result concerned screening behavior rather than system stability. All 27 rows were marked `fit_for_review = false`. That suggests that the current prompt configuration is too strict or too literal for the test research question. The result does not imply that the pipeline failed. Instead, it indicates that the infrastructure and structured-output method are working, while the inclusion logic needs tuning.

The run also demonstrated that modest local hardware can support a practical first-pass screening workflow. Although the throughput was limited, the system completed the batch in minutes rather than hours and produced an auditable output artifact for later human review.

## PART IV. DISCUSSION

The findings support the usefulness of separating retrieval from screening. HyperCube’s PubMed search can remain broad to maximize recall, while the screening stage can remain narrow and explicitly tied to the research question. This is a methodological advantage because it preserves the candidate corpus as evidence rather than letting interpretation occur too early in the retrieval stage.

The structured CSV is the key enabling layer. Because article content, search provenance, and the research question remain visible in tabular form, the resulting dataset is reusable and inspectable. The model’s judgment does not replace that evidence; it is added as a second layer. This makes the output more auditable than a conventional workflow in which a reviewer scans titles and abstracts manually and records decisions in ad hoc notes.

The present study also suggests that a compact local model can play a practical role in early review work when the task is carefully bounded. A 3B-class Qwen-family model is not sufficient to replace domain expertise or full literature synthesis. However, it appears sufficient for repetitive row-wise operations such as short summarization and tentative inclusion triage, provided that prompts and response contracts are well designed.

The current limitation is prompt quality. Because every article was rejected for the test question, future work should focus on refining how the model interprets borderline relevance while maintaining a conservative standard for explicit evidence. Additional work could also examine concurrency, alternate local models, and comparisons between different research questions or screening prompts on the same dataset.

Overall, this project demonstrates a scientifically useful pipeline rather than a final-review automation system. Its contribution is a reproducible local method for moving from search terms to a structured evidence table and then from that evidence table to first-pass machine-assisted triage. The result is a workflow that is more explicit, more repeatable, and easier to audit than an informal manual screening process.
