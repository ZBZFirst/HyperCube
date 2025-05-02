// pubmedFetcher.js
const BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
const DEFAULT_API_KEY = '3834945c08440921ade60d29a8bdd9553808';
const DEFAULT_SEARCH_TERM = 'Liquid Mechanical Ventilation Life Support Humans';
const BATCH_SIZE = 50;

// Private helper functions
async function searchPmids(apiKey, searchTerm) {
    console.log(`Searching PubMed for: '${searchTerm}'...`);
    const response = await fetch(`${BASE_URL}esearch.fcgi?db=pubmed&term=${encodeURIComponent(searchTerm)}&retmax=100000&retmode=json&api_key=${apiKey}`);
    const data = await response.json();
    const idlist = data.esearchresult.idlist;
    console.log(`Found ${idlist.length} articles`);
    return idlist;
}

async function fetchMetadata(apiKey, pmids) {
    console.log(`Fetching metadata for ${pmids.length} articles...`);
    const allData = {};
    
    for (let i = 0; i < pmids.length; i += BATCH_SIZE) {
        const batch = pmids.slice(i, i + BATCH_SIZE);
        const ids = batch.join(',');
        const response = await fetch(`${BASE_URL}esummary.fcgi?db=pubmed&id=${ids}&retmode=json&api_key=${apiKey}`);
        const data = await response.json();
        const summaries = data.result;
        
        batch.forEach(pid => {
            if (summaries[pid]) {
                allData[pid] = summaries[pid];
            }
        });
        
        // Progress indicator
        if ((i / BATCH_SIZE) % 5 === 0) {
            console.log(`Processed ${Math.min(i + BATCH_SIZE, pmids.length)}/${pmids.length} records...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 400));
    }
    
    return allData;
}

async function fetchMeshKeywords(apiKey, pmids) {
    console.log(`Fetching detailed data (abstracts, MeSH terms, etc.)...`);
    const tagData = {};

    for (let i = 0; i < pmids.length; i += BATCH_SIZE) {
        const batch = pmids.slice(i, i + BATCH_SIZE);
        const ids = batch.join(',');
        const response = await fetch(`${BASE_URL}efetch.fcgi?db=pubmed&id=${ids}&retmode=xml&api_key=${apiKey}`);
        const text = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");

        const articles = xmlDoc.getElementsByTagName('PubmedArticle');
        for (const article of articles) {
            const pmid = article.querySelector('PMID')?.textContent;
            if (!pmid) continue;

            // Extract abstract
            const abstractTexts = article.querySelectorAll('AbstractText');
            let abstractSections = [];
            abstractTexts.forEach(abstractText => {
                if (abstractText.textContent) {
                    const label = abstractText.getAttribute('Label');
                    if (label) {
                        abstractSections.push(`${label}: ${abstractText.textContent}`);
                    } else {
                        abstractSections.push(abstractText.textContent);
                    }
                }
            });
            const abstract = abstractSections.join(' ');

            // Extract identifiers and links
            const doi = Array.from(article.querySelectorAll('ArticleId'))
                .find(el => el.getAttribute('IdType') === 'doi')?.textContent;
            
            const pmcId = Array.from(article.querySelectorAll('ArticleId'))
                .find(el => el.getAttribute('IdType') === 'pmc')?.textContent;
            
            const fulltextUrls = [];
            Array.from(article.querySelectorAll('ArticleId[IdType="pmc"]'))
                .forEach(url => fulltextUrls.push(`https://www.ncbi.nlm.nih.gov/pmc/articles/${url.textContent}/`));
            Array.from(article.querySelectorAll('ELocationID[EIdType="url"]'))
                .forEach(url => fulltextUrls.push(url.textContent));

            const meshTerms = Array.from(article.querySelectorAll('MeshHeading DescriptorName'))
                .map(el => el.textContent);
            
            const keywords = Array.from(article.querySelectorAll('KeywordList Keyword'))
                .map(el => el.textContent);

            tagData[pmid] = {
                'Abstract': abstract,
                'DOI': doi || '',
                'PMC_ID': pmcId || '',
                'FullText_URLs': fulltextUrls,
                'MeSH_Terms': meshTerms.slice(0, 30),
                'Keywords': keywords.slice(0, 30)
            };
        }

        // Progress indicator
        if ((i / BATCH_SIZE) % 5 === 0) {
            console.log(`Processed ${Math.min(i + BATCH_SIZE, pmids.length)}/${pmids.length} records...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 400));
    }

    return tagData;
}

function prepareData(metadata, tagData) {
    const records = [];
    
    for (const [pmid, meta] of Object.entries(metadata)) {
        const row = {'PMID': pmid};

        // Handle basic fields
        row['Title'] = meta.title || '';
        row['Source'] = meta.source || '';
        row['Doi'] = meta.doi || '';
        
        // Handle authors
        let authorsList = [];
        try {
            authorsList = typeof meta.authors === 'string' ? JSON.parse(meta.authors) : meta.authors || [];
        } catch (e) {
            authorsList = [];
        }
        
        // Process individual authors and collective names
        const individualAuthors = [];
        const collectiveNames = [];
        
        authorsList.forEach(author => {
            if (author.authtype === 'Author') {
                individualAuthors.push(author.name || '');
            } else if (author.authtype === 'CollectiveName') {
                collectiveNames.push(author.name || '');
            }
        });
        
        // Add individual authors (up to 20)
        for (let i = 0; i < 20; i++) {
            row[`Author_${i+1}`] = individualAuthors[i] || '';
        }
        
        // Add collective names (combined)
        row['Collective_Name'] = collectiveNames.join('; ');
        
        // Parse publication date
        const pubdate = meta.pubdate || '';
        let year = '', month = '', day = '';
        
        if (pubdate) {
            const dateParts = pubdate.split(' ');
            if (dateParts.length) {
                // Extract year (first part that's 4 digits)
                for (const part of dateParts) {
                    if (/^\d{4}$/.test(part)) {
                        year = part;
                        break;
                    }
                }
                
                // Extract month (first alphabetic part)
                const monthCandidates = dateParts.filter(p => /[a-zA-Z-]/.test(p));
                if (monthCandidates.length) {
                    month = monthCandidates[0].split('-')[0];
                }
                
                // Extract day (last numeric part that's 1-2 digits)
                const dayCandidates = dateParts.filter(p => /^\d{1,2}$/.test(p));
                if (dayCandidates.length && dayCandidates[dayCandidates.length - 1] !== year) {
                    day = dayCandidates[dayCandidates.length - 1];
                }
            }
        }
        
        row['PubYear'] = year;
        row['PubMonth'] = month;
        row['PubDay'] = day;
        row['OriginalPubDate'] = pubdate;
        
        // Add tag data
        const tags = tagData[pmid] || {
            'Abstract': '',
            'DOI': '',
            'PMC_ID': '',
            'MeSH_Terms': [],
            'Keywords': []
        };
        
        row['Abstract'] = tags.Abstract || '';
        row['DOI'] = tags.DOI || '';
        row['DOI_Link'] = row['DOI'] ? `https://doi.org/${row['DOI']}` : '';
        row['PMC_ID'] = tags.PMC_ID || '';
        row['PMC_Link'] = row['PMC_ID'] ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${row['PMC_ID']}/` : '';

        // Add MeSH and Keywords
        for (let i = 0; i < 30; i++) {
            row[`MeSH_${i+1}`] = tags.MeSH_Terms[i] || '';
            row[`Keyword_${i+1}`] = tags.Keywords[i] || '';
        }

        records.push(row);
    }
    
    return records;
}

function convertToCSV(data) {
    if (!data.length) return '';
    
    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Create CSV content
    const csvRows = [
        headers.join(','), // header row
        ...data.map(row => 
            headers.map(field => 
                `"${String(row[field] || '').replace(/"/g, '""')}"`
            ).join(',')
        )
    ];
    
    return csvRows.join('\n');
}

// Public export function
export async function fetchPubMedData(searchTerm = DEFAULT_SEARCH_TERM, apiKey = DEFAULT_API_KEY) {
    const startTime = Date.now();
    
    try {
        // Fetch data from PubMed
        const pmids = await searchPmids(apiKey, searchTerm);
        const metadata = await fetchMetadata(apiKey, pmids);
        const tagData = await fetchMeshKeywords(apiKey, pmids);
        
        // Prepare data
        const records = prepareData(metadata, tagData);
        const csvContent = convertToCSV(records);
        
        // Create a filename-safe version of the search term
        const safeSearchTerm = searchTerm.replace(/[^\w\s]/g, '').replace(/\s+/g, '_').slice(0, 50);
        const filename = `pubmed_results_${safeSearchTerm}_${Math.floor(Date.now() / 1000)}.csv`;
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Completion message
        const elapsedTime = (Date.now() - startTime) / 1000;
        console.log(`\n==================================================`);
        console.log(`Successfully processed ${records.length} articles`);
        console.log(`Results saved to: ${filename}`);
        console.log(`Total execution time: ${elapsedTime.toFixed(2)} seconds`);
        console.log(`==================================================`);
        
        return records;
    } catch (error) {
        console.error('Error fetching PubMed data:', error);
        throw error;
    }
}

// Export function to be called from dev console
window.fetchPubMedDataFromConsole = async function() {
    const searchTerm = prompt('Enter search term:', DEFAULT_SEARCH_TERM) || DEFAULT_SEARCH_TERM;
    const apiKey = prompt('Enter your NCBI API key (or leave blank for default):', '') || DEFAULT_API_KEY;
    
    console.log(`Starting PubMed search for: "${searchTerm}"`);
    console.log(`Using API key: ...${apiKey.slice(-5)}`);
    
    try {
        const data = await fetchPubMedData(searchTerm, apiKey);
        console.log('PubMed data fetched successfully:', data);
        return data;
    } catch (error) {
        console.error('Failed to fetch PubMed data:', error);
    }
};
