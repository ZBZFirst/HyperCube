# HyperCube
DESCRIPTION AND PURPOSE
The purpose of this repository is to hold my search query program for PubMed. This is how I do my research in my free time because it allows me to gather all of the data into a structured format and make it usable immediately. The key to this being possible is using the "Text Zone" to display the currently selected articles Title, Abstract, Authors, Year of Publishment and Keywords. This makes it easy to do a general basic search. Coding for filters and all that jazz was too much time for the return and can make queries way too small based on niche keywords.

The API key in the code does not work. You will need to obtain your own from PubMed.Gov, it is free to sign up there since it is a Government Database so just remember that and respect the API limits they request that you use.

There is a capability to utilize the PMID from this list to access the PMC ID List in the same government database but I found it to be not "fully fleshed out" because when I ran my searches, there were still articles from the last few years that did not have a PMC ID, and if you only pull PMC ID articles, then you will filter a lot of good information. It is important to note this because the PMC ID list contains the "Cited By" list so that you can see how many times an article has been cited. This can then be applied as a "Z" value for the cubes so that more Cited Articles will appear larger.

Anyway, It was fun to vibecode this.

CONTROLS

WASD for Camera Movement
SPACEBAR to go UP
CNTRL to go DOWN
G to SHOOT

Bullets follow the Camera

DELETION

You can delete cubes from the scene, thereby removing articles that were represented by that cube from the list that was obtained. This can be done in bulk on the FIRST DELETION. Subsequent deletions will ONLY DELETE ONE AT A TIME REGARDLESS OF SELECTION AMOUNT.

This is to prevent accidental deletion after a major deletion and losing a lot of work.

Remember to Filter before Starting Notes, There is no Save.

EXPORTING

Data can be exported at any time but data is not saved between reloads of the screen. So make sure you export before you leave. Also, the data can not be reloaded into the program easily. So start from scratch always.

Good Luck!

Live viewer:

https://zbzfirst.github.io/HyperCube/

LOCAL SCREENING SERVER

For the in-browser LM Studio screening controls, serve HyperCube through the local helper server instead of opening the HTML file directly:

`python3 server.py`

Then open:

`http://127.0.0.1:8000`

This server also provides a same-origin LM Studio proxy so `Check for Models` and browser-side screening can call remote endpoints without browser CORS failures.

LLM SCREENING

`pubmed_data.csv` can now be used as the basis for first-pass eligibility screening against a local or remote LM Studio model.

Run:

`node screenPubMedCsv.mjs --input pubmed_data.csv --limit 5`

The script reads `ResearchQuestion`, `Title`, and `Abstract` from each row, submits them to the configured LM Studio `/v1/chat/completions` endpoint, and writes an augmented CSV with screening fields appended.

Details:

`/home/paulwasthere/AndroidStudioProjects/HyperCube-main/LLM_SCREENING.md`

FULL WORKFLOW

For the full write-up of how HyperCube produces the structured CSV, how that data is handed off to LM Studio, and how the output is used in the current test case, see:

`/home/paulwasthere/AndroidStudioProjects/HyperCube-main/WORKFLOW_TO_LM_STUDIO.md`

PROJECT SUMMARY

For a presentation-ready summary of the project, including the proposed use of a low-powered Qwen-family model for summarization and first-pass classification, see:

`/home/paulwasthere/AndroidStudioProjects/HyperCube-main/PROJECT_SUMMARY.md`
