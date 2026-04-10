// script.js start
import * as THREE from 'three';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { createScene } from './createScene.js';
import { createUI, setupUI, showLoadingIndicator, removeLoadingIndicator, showErrorToUser, clearTextZone, createFallbackScene } from './uiManager.js';
import { loadData, populateDataTable, updateTextZone, getData, setData, addAnnotation } from './dataManager.js';
import { createCubesFromData, getCubes, highlightCubeByPmid, centerCameraOnCube, initCubeManager, deleteSelectedCubes, updateGeometryScale } from './cubeManager.js';
import { hidePubMedFetchOverlay } from './pubmedOverlay.js';
import { deleteSelectedFromData } from './deleteCubes.js';
import { exportFilteredData } from './saveCubes.js';
import { setupControls } from './controlsSetup.js';
import { setupEventHandlers } from './eventHandlers.js';
import { setGeometryScaleMode, GeometryScaleModes } from './createCube.js';
import { fetchPubMedData, DEFAULT_API_KEY } from './pubmedFetcher.js';
import { saveWorkspaceSnapshot, loadWorkspaceSnapshot, clearWorkspaceSnapshot } from './screeningStorage.js';

let sceneObjects = null;
let selectedCubes = [];
let lastSelectedCube = null;
let currentData = [];
let selectionHandler = null;
const PUBMED_KEY_STORAGE_KEY = 'hypercube.pubmedApiKey';
const DEFAULT_LM_ENDPOINT = 'http://127.0.0.1:1234/v1/chat/completions';
const DEFAULT_LM_MODEL = 'qwen2.5-3b-instruct';
const DEFAULT_REMOTE_LM_HOST = '192.168.68.82';
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
                            enum: ['greeting', 'casual_chat', 'question', 'command', 'empty_input', 'incomplete_article', 'non_article_text', 'other']
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
let screeningState = {
    status: 'idle',
    currentIndex: 0,
    totalRows: 0,
    endpoint: DEFAULT_LM_ENDPOINT,
    model: DEFAULT_LM_MODEL,
    updatedAt: null
};
let stopScreeningRequested = false;

function getBrowseCardSummary(article) {
    const abstract = String(article?.Abstract || '').trim();
    if (!abstract) return 'No abstract available.';
    return abstract.length > 180 ? `${abstract.slice(0, 180)}...` : abstract;
}

function renderFullscreenBrowseList(data) {
    const container = document.getElementById('fullscreen-browse-list');
    if (!container) return;

    container.innerHTML = '';

    data.forEach(article => {
        const isSelected = selectedCubes.some(cube => cube?.userData?.PMID === article.PMID);
        const card = document.createElement('button');
        card.type = 'button';
        card.className = `browse-card${isSelected ? ' selected' : ''}`;

        const year = article.PubYear || 'Year?';
        const source = article.Source || 'Unknown source';
        const pmid = article.PMID || 'No PMID';

        card.innerHTML = `
            <div class="browse-card-header">
                <div class="browse-card-title">${article.Title || 'Untitled article'}</div>
                <span class="browse-chip ${isSelected ? 'selected' : ''}">${isSelected ? 'Selected' : 'Open'}</span>
            </div>
            <div class="browse-card-meta">
                <span class="browse-chip">${year}</span>
                <span class="browse-chip">${source}</span>
                <span class="browse-chip">PMID ${pmid}</span>
            </div>
            <div class="browse-card-abstract">${getBrowseCardSummary(article)}</div>
        `;

        card.addEventListener('click', () => {
            const currentlySelected = selectedCubes.some(cube => cube?.userData?.PMID === article.PMID);
            const result = highlightCubeByPmid(article.PMID, !currentlySelected, selectedCubes, lastSelectedCube);
            if (result && selectionHandler) {
                selectionHandler(result.selectedCubes, result.lastSelectedCube);
            }
            if (document.fullscreenElement === document.getElementById('app-container')) {
                document.querySelector('[data-panel-target="text-container"]')?.click();
            }
        });

        container.appendChild(card);
    });
}

function setSortButtonState(activeMode) {
    document.querySelectorAll('[data-sort-mode]').forEach(button => {
        button.classList.toggle('active', button.dataset.sortMode === activeMode);
    });
}

function setScaleButtonState(activeMode) {
    document.querySelectorAll('[data-scale-mode]').forEach(button => {
        button.classList.toggle('active', button.dataset.scaleMode === activeMode);
    });
}

function setupControlGroups() {
    document.addEventListener('click', (event) => {
        const clickedInsideGroup = event.target.closest('.control-group');
        if (!clickedInsideGroup) {
            document.querySelectorAll('.control-options').forEach(group => group.classList.remove('open'));
        }
    });

    window.toggleControlGroup = (groupId) => {
        document.querySelectorAll('.control-options').forEach(group => {
            if (group.id !== groupId) {
                group.classList.remove('open');
            }
        });
        const target = document.getElementById(groupId);
        if (target) target.classList.toggle('open');
    };

    window.applySortMode = (mode) => {
        if (!window.PositionModes || !window.setPositionMode) return;
        const normalized = String(mode || '').toUpperCase();
        const positionMode = window.PositionModes[normalized];
        if (!positionMode) return;

        window.setPositionMode(positionMode);
        setSortButtonState(positionMode);
    };

    window.applyGeometryScaleMode = (mode) => {
        setGeometryScaleMode(mode);
        updateGeometryScale();
        setScaleButtonState(mode);
    };
}

function applyNewDataset(data) {
    if (!sceneObjects?.scene || !Array.isArray(data)) return;
    setData(data);
    currentData = data;
    selectedCubes = [];
    lastSelectedCube = null;
    clearTextZone();
    createCubesFromData(data, sceneObjects.scene);
    setupUI(data, () => [...selectedCubes], () => lastSelectedCube, selectionHandler);
    setupEventHandlers(selectedCubes, lastSelectedCube, sceneObjects.scene);
    renderFullscreenBrowseList(data);
    persistWorkspaceState();
}

function setupQueryPanel() {
    const apiKeyInput = document.getElementById('pubmed-api-input');
    const rememberKeyCheckbox = document.getElementById('remember-pubmed-key');
    const endpointInput = document.getElementById('lmstudio-endpoint-input');
    const modelInput = document.getElementById('lmstudio-model-input');
    const screeningStatus = document.getElementById('screening-status');
    const startScreeningBtn = document.getElementById('start-screening-btn');
    const stopScreeningBtn = document.getElementById('stop-screening-btn');
    const saveCurrentOutputBtn = document.getElementById('save-current-output-btn');
    const checkModelsBtn = document.getElementById('check-models-btn');
    const screeningConfigDialog = document.getElementById('screening-config-dialog');
    const lmHostInput = document.getElementById('lmstudio-host-input');
    const lmPortInput = document.getElementById('lmstudio-port-input');
    const lmPathInput = document.getElementById('lmstudio-path-input');
    const checkModelsDialogBtn = document.getElementById('check-models-dialog-btn');
    const applyScreeningConfigBtn = document.getElementById('apply-screening-config-btn');
    const refreshScreeningPreviewBtn = document.getElementById('refresh-screening-preview-btn');
    const screeningConfigStatus = document.getElementById('screening-config-status');
    const screeningPreviewOutput = document.getElementById('screening-preview-output');
    const screeningProgressBar = document.getElementById('screening-progress-bar');
    const screeningProgressText = document.getElementById('screening-progress-text');

    if (apiKeyInput && rememberKeyCheckbox) {
        const savedApiKey = window.localStorage.getItem(PUBMED_KEY_STORAGE_KEY);
        if (savedApiKey) {
            apiKeyInput.value = savedApiKey;
            rememberKeyCheckbox.checked = true;
        }

        rememberKeyCheckbox.addEventListener('change', () => {
            if (rememberKeyCheckbox.checked) {
                window.localStorage.setItem(PUBMED_KEY_STORAGE_KEY, apiKeyInput.value.trim());
            } else {
                window.localStorage.removeItem(PUBMED_KEY_STORAGE_KEY);
            }
        });

        apiKeyInput.addEventListener('input', () => {
            if (rememberKeyCheckbox.checked) {
                window.localStorage.setItem(PUBMED_KEY_STORAGE_KEY, apiKeyInput.value.trim());
            }
        });
    }

    const setConfigStatus = (message) => {
        if (screeningConfigStatus) screeningConfigStatus.textContent = message;
    };

    const populateModelOptions = (models, preferredModel) => {
        if (!modelInput) return;

        const uniqueModels = Array.from(new Set((models || []).filter(Boolean)));
        const fallbackModel = preferredModel || screeningState.model || DEFAULT_LM_MODEL;
        const optionValues = uniqueModels.length ? uniqueModels : [fallbackModel];

        modelInput.innerHTML = '';
        optionValues.forEach((modelId) => {
            const option = document.createElement('option');
            option.value = modelId;
            option.textContent = modelId;
            modelInput.appendChild(option);
        });

        const selectedModel = optionValues.includes(fallbackModel) ? fallbackModel : optionValues[0];
        modelInput.value = selectedModel;
        screeningState.model = selectedModel;
    };

    const buildEndpointFromDialog = () => {
        const host = lmHostInput?.value?.trim() || DEFAULT_REMOTE_LM_HOST;
        const port = lmPortInput?.value?.trim() || '1234';
        const path = lmPathInput?.value?.trim() || '/v1/chat/completions';
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `http://${host}:${port}${normalizedPath}`;
    };

    const fetchAvailableModels = async (endpoint) => {
        const modelsUrl = deriveModelsUrl(endpoint);
        const response = await fetch(modelsUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        const models = Array.isArray(payload?.data)
            ? payload.data.map((item) => item?.id).filter(Boolean)
            : [];
        return { modelsUrl, models };
    };

    if (endpointInput) endpointInput.value = screeningState.endpoint || DEFAULT_LM_ENDPOINT;
    populateModelOptions([screeningState.model || DEFAULT_LM_MODEL], screeningState.model || DEFAULT_LM_MODEL);

    const syncDialogFieldsFromEndpoint = () => {
        const endpoint = endpointInput?.value?.trim() || DEFAULT_LM_ENDPOINT;
        try {
            const url = new URL(endpoint);
            if (lmHostInput) lmHostInput.value = url.hostname;
            if (lmPortInput) lmPortInput.value = url.port || '1234';
            if (lmPathInput) lmPathInput.value = url.pathname || '/v1/chat/completions';
        } catch {
            if (lmHostInput) lmHostInput.value = '127.0.0.1';
            if (lmPortInput) lmPortInput.value = '1234';
            if (lmPathInput) lmPathInput.value = '/v1/chat/completions';
        }
    };

    const updateScreeningPreview = () => {
        if (!screeningPreviewOutput) return;
        const row = currentData?.[0];
        if (!row) {
            screeningPreviewOutput.value = 'No dataset loaded. Fetch or load articles first to preview the first screening request.';
            return;
        }

        const endpoint = endpointInput?.value?.trim() || DEFAULT_LM_ENDPOINT;
        const model = modelInput?.value?.trim() || DEFAULT_LM_MODEL;
        const payload = buildScreeningPayload(row, { endpoint, model });

        screeningPreviewOutput.value = [
            `Endpoint: ${endpoint}`,
            `Model: ${model}`,
            '',
            'System Prompt:',
            payload.messages[0].content,
            '',
            'User Message:',
            payload.messages[1].content
        ].join('\n');
    };

    const runModelCheck = async () => {
        const endpoint = buildEndpointFromDialog();
        if (endpointInput) endpointInput.value = endpoint;
        screeningState.endpoint = endpoint;
        setConfigStatus(`Checking ${deriveModelsUrl(endpoint)} ...`);
        updateScreeningPreview();

        try {
            const { modelsUrl, models } = await fetchAvailableModels(endpoint);
            populateModelOptions(models, screeningState.model || DEFAULT_LM_MODEL);
            updateScreeningPreview();
            setConfigStatus(
                models.length
                    ? `Found ${models.length} model${models.length === 1 ? '' : 's'} at ${modelsUrl}.`
                    : `No models were returned from ${modelsUrl}.`
            );
        } catch (error) {
            setConfigStatus(`Unable to fetch models: ${error.message}`);
            if (screeningPreviewOutput) {
                screeningPreviewOutput.value = `Unable to fetch models from ${deriveModelsUrl(endpoint)}.\n\n${error.message}`;
            }
        }
    };

    checkModelsBtn?.addEventListener('click', () => {
        syncDialogFieldsFromEndpoint();
        setConfigStatus('');
        updateScreeningPreview();
        screeningConfigDialog?.showModal();
    });

    checkModelsDialogBtn?.addEventListener('click', runModelCheck);

    applyScreeningConfigBtn?.addEventListener('click', async () => {
        const endpoint = buildEndpointFromDialog();
        if (endpointInput) endpointInput.value = endpoint;
        screeningState.endpoint = endpoint;
        screeningState.model = modelInput?.value?.trim() || DEFAULT_LM_MODEL;
        updateScreeningPreview();
        await persistWorkspaceState();
        setConfigStatus(`Ready to screen with ${screeningState.model} at ${endpoint}.`);
        screeningConfigDialog?.close();
    });

    refreshScreeningPreviewBtn?.addEventListener('click', () => {
        const endpoint = buildEndpointFromDialog();
        if (endpointInput) endpointInput.value = endpoint;
        screeningState.endpoint = endpoint;
        updateScreeningPreview();
    });

    modelInput?.addEventListener('change', async () => {
        screeningState.model = modelInput.value || DEFAULT_LM_MODEL;
        updateScreeningPreview();
        await persistWorkspaceState();
    });

    const updateScreeningControls = () => {
        const running = screeningState.status === 'running';
        if (startScreeningBtn) startScreeningBtn.disabled = running;
        if (stopScreeningBtn) stopScreeningBtn.disabled = !running;
        if (screeningProgressBar) {
            screeningProgressBar.max = Math.max(screeningState.totalRows || 1, 1);
            screeningProgressBar.value = Math.min(screeningState.currentIndex || 0, screeningProgressBar.max);
        }
        if (screeningProgressText) {
            screeningProgressText.textContent = `${Math.min(screeningState.currentIndex || 0, screeningState.totalRows || 0)} / ${screeningState.totalRows || 0}`;
        }
    };

    startScreeningBtn?.addEventListener('click', () => startScreeningRun({ resumeExisting: false }));
    stopScreeningBtn?.addEventListener('click', () => {
        stopScreeningRequested = true;
        setScreeningStatus('Stop requested. Current row will finish before the runner pauses.');
        updateScreeningControls();
    });
    saveCurrentOutputBtn?.addEventListener('click', () => {
        exportFilteredData(currentData);
        setScreeningStatus('Current dataset exported.');
    });

    window.runPubMedQueryToCsv = async () => {
        const searchInput = document.getElementById('pubmed-search-input');
        const apiKeyInput = document.getElementById('pubmed-api-input');
        const researchQuestionInput = document.getElementById('research-question-input');
        const queryStatus = document.getElementById('query-status');

        const searchTerm = searchInput?.value?.trim();
        const apiKey = apiKeyInput?.value?.trim() || DEFAULT_API_KEY;
        const researchQuestion = researchQuestionInput?.value?.trim() || '';

        if (!searchTerm) {
            showErrorToUser('Please enter a PubMed search term.');
            return;
        }

        try {
            if (queryStatus) queryStatus.textContent = 'Fetching PubMed data...';
            showLoadingIndicator();

            const data = await fetchPubMedData(searchTerm, apiKey);
            data.forEach(row => {
                row.ResearchQuestion = researchQuestion;
                row.PubMedQuery = searchTerm;
            });

            applyNewDataset(data);
            exportFilteredData(data);

            if (queryStatus) {
                queryStatus.textContent = `Done: fetched ${data.length} rows and exported CSV.`;
            }
            screeningState.totalRows = data.length;
            screeningState.status = 'idle';
            screeningState.currentIndex = 0;
            screeningState.updatedAt = new Date().toISOString();
            setScreeningStatus('Dataset ready for screening.');
        } catch (error) {
            console.error('Query-to-CSV failed:', error);
            showErrorToUser(`PubMed query failed: ${error.message}`);
            if (queryStatus) queryStatus.textContent = 'Failed. Check API key/search term and try again.';
        } finally {
            removeLoadingIndicator();
        }
    };

    if (screeningStatus && screeningState.updatedAt && screeningState.status !== 'idle') {
        setScreeningStatus(`Restored saved run: ${screeningState.status} at row ${Math.min(screeningState.currentIndex + 1, screeningState.totalRows || 0)}.`);
    }
    updateScreeningControls();
}

function setScreeningStatus(message) {
    const screeningStatus = document.getElementById('screening-status');
    if (screeningStatus) screeningStatus.textContent = message;
}

async function persistWorkspaceState() {
    try {
        await saveWorkspaceSnapshot({
            data: currentData,
            screeningState: {
                ...screeningState,
                updatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Failed to persist workspace state:', error);
    }
}

function deriveModelsUrl(endpoint) {
    const url = new URL(endpoint);
    url.pathname = '/v1/models';
    url.search = '';
    return url.toString();
}

function ensureScreeningColumns(row) {
    SCREENING_HEADERS.forEach((header) => {
        if (!(header in row)) {
            row[header] = '';
        }
    });
    return row;
}

function getScreenableRowIndices({ resumeExisting }) {
    const rows = currentData || [];
    if (!resumeExisting) {
        return rows.map((_, index) => index);
    }
    return rows
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => !String(row.LlmScreenedAt || '').trim())
        .map(({ index }) => index);
}

async function startScreeningRun({ resumeExisting }) {
    if (!currentData.length) {
        showErrorToUser('No dataset loaded for screening.');
        return;
    }

    const endpoint = document.getElementById('lmstudio-endpoint-input')?.value?.trim() || DEFAULT_LM_ENDPOINT;
    const model = document.getElementById('lmstudio-model-input')?.value?.trim() || DEFAULT_LM_MODEL;
    const targetIndices = getScreenableRowIndices({ resumeExisting });

    if (!targetIndices.length) {
        setScreeningStatus('No rows require screening.');
        return;
    }

    stopScreeningRequested = false;
    screeningState = {
        status: 'running',
        currentIndex: 0,
        totalRows: targetIndices.length,
        endpoint,
        model,
        updatedAt: new Date().toISOString()
    };
    setScreeningStatus(`Starting screening run for ${targetIndices.length} rows...`);
    syncScreeningProgress(0, targetIndices.length);
    await persistWorkspaceState();

    for (let runIndex = 0; runIndex < targetIndices.length; runIndex += 1) {
        if (stopScreeningRequested) {
            screeningState.status = 'paused';
            screeningState.currentIndex = runIndex;
            await persistWorkspaceState();
            syncScreeningProgress(runIndex, targetIndices.length);
            setScreeningStatus(`Run paused after ${runIndex} of ${targetIndices.length} rows.`);
            return;
        }

        const rowIndex = targetIndices[runIndex];
        const row = ensureScreeningColumns(currentData[rowIndex]);
        screeningState.currentIndex = runIndex;
        screeningState.totalRows = targetIndices.length;
        syncScreeningProgress(runIndex, targetIndices.length);
        setScreeningStatus(`Screening row ${runIndex + 1} of ${targetIndices.length}: PMID ${row.PMID || '(none)'}`);

        const result = await screenRow(row, { endpoint, model });
        currentData[rowIndex] = { ...row, ...result };
        setData(currentData);
        screeningState.currentIndex = runIndex + 1;
        screeningState.updatedAt = new Date().toISOString();
        syncScreeningProgress(runIndex + 1, targetIndices.length);
        await persistWorkspaceState();
    }

    screeningState.status = 'completed';
    screeningState.currentIndex = targetIndices.length;
    screeningState.updatedAt = new Date().toISOString();
    syncScreeningProgress(targetIndices.length, targetIndices.length);
    await persistWorkspaceState();
    setScreeningStatus(`Screening complete. Processed ${targetIndices.length} rows.`);
}

function syncScreeningProgress(current, total) {
    screeningState.currentIndex = current;
    screeningState.totalRows = total;
    const progressBar = document.getElementById('screening-progress-bar');
    const progressText = document.getElementById('screening-progress-text');
    const startBtn = document.getElementById('start-screening-btn');
    const stopBtn = document.getElementById('stop-screening-btn');
    const running = screeningState.status === 'running';

    if (progressBar) {
        progressBar.max = Math.max(total || 1, 1);
        progressBar.value = Math.min(current, progressBar.max);
    }
    if (progressText) {
        progressText.textContent = `${current} / ${total}`;
    }
    if (startBtn) startBtn.disabled = running;
    if (stopBtn) stopBtn.disabled = !running;
}

async function screenRow(row, options) {
    const title = String(row.Title || '').trim();
    const abstract = String(row.Abstract || '').trim();
    const researchQuestion = String(row.ResearchQuestion || '').trim();

    if (!researchQuestion) {
        return mapScreeningError('Missing ResearchQuestion', options, title || abstract, 'other', 'Missing ResearchQuestion in row.');
    }

    if (!title && !abstract) {
        return mapScreeningError('Missing Title and Abstract', options, '', 'empty_input', 'Missing Title and Abstract in row.');
    }

    try {
        const response = await fetch(options.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildScreeningPayload(row, options))
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        const parsed = parseModelContent(content);
        return mapScreeningResponse(parsed, options);
    } catch (error) {
        return {
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
        };
    }
}

function buildScreeningPayload(row, options) {
    return {
        model: options.model,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
                role: 'user',
                content: [
                    `ResearchQuestion: ${String(row.ResearchQuestion || '').trim()}`,
                    `Title: ${String(row.Title || '').trim()}`,
                    `Abstract: ${String(row.Abstract || '').trim()}`
                ].join('\n\n')
            }
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

function mapScreeningError(errorMessage, options, receivedText, invalidKind, reason) {
    return {
        LlmStatus: 'invalid_input',
        LlmFitForReview: '',
        LlmSummary256: '',
        LlmReason: reason,
        LlmInvalidKind: invalidKind,
        LlmReceivedText: receivedText,
        LlmModel: options.model,
        LlmEndpoint: options.endpoint,
        LlmScreenedAt: new Date().toISOString(),
        LlmError: errorMessage
    };
}

function setupFullscreenMode() {
    const appContainer = document.getElementById('app-container');
    const fullscreenButton = document.getElementById('fullscreen-btn');
    const exitButton = document.getElementById('overlay-exit-fullscreen-btn');
    const panelButtons = document.querySelectorAll('[data-panel-target]');

    if (!appContainer || !fullscreenButton) return;

    const setPanelCollapsed = (targetId, collapsed) => {
        const target = document.getElementById(targetId);
        if (!target) return;
        target.classList.toggle('panel-collapsed', collapsed);
        document.querySelectorAll(`[data-panel-target="${targetId}"]`).forEach(button => {
            if (button.classList.contains('overlay-toggle')) {
                button.classList.toggle('active', !collapsed);
            } else {
                button.textContent = collapsed ? 'Show' : 'Hide';
            }
        });
    };

    const setFullscreenFocusPanel = (targetId) => {
        const panelIds = ['data-container', 'text-container', 'button-container'];
        panelIds.forEach(panelId => {
            setPanelCollapsed(panelId, panelId !== targetId);
        });
    };

    const ensurePanelsVisible = () => {
        ['data-container', 'text-container', 'button-container'].forEach(panelId => {
            setPanelCollapsed(panelId, false);
        });
    };

    const syncFullscreenState = () => {
        const isFullscreen = document.fullscreenElement === appContainer;
        appContainer.classList.toggle('app-fullscreen', isFullscreen);
        fullscreenButton.textContent = isFullscreen ? 'Exit Fullscreen' : 'Fullscreen';
        if (isFullscreen) {
            setFullscreenFocusPanel('data-container');
        } else {
            ensurePanelsVisible();
        }
    };

    fullscreenButton.addEventListener('click', async () => {
        try {
            if (document.fullscreenElement === appContainer) {
                await document.exitFullscreen();
            } else {
                await appContainer.requestFullscreen();
            }
        } catch (error) {
            console.error('Fullscreen toggle failed:', error);
            showErrorToUser(`Fullscreen failed: ${error.message}`);
        }
    });

    exitButton?.addEventListener('click', async () => {
        if (document.fullscreenElement === appContainer) {
            await document.exitFullscreen();
        }
    });

    panelButtons.forEach(button => {
        if (button.id === 'overlay-exit-fullscreen-btn') return;
        button.addEventListener('click', () => {
            const targetId = button.dataset.panelTarget;
            const target = document.getElementById(targetId);
            if (!target) return;
            const inFullscreen = document.fullscreenElement === appContainer;
            if (inFullscreen) {
                const isCollapsed = target.classList.contains('panel-collapsed');
                if (isCollapsed) {
                    setFullscreenFocusPanel(targetId);
                } else {
                    setPanelCollapsed(targetId, true);
                }
                return;
            }

            const shouldCollapse = !target.classList.contains('panel-collapsed');
            setPanelCollapsed(targetId, shouldCollapse);
        });
    });

    document.addEventListener('fullscreenchange', syncFullscreenState);
    syncFullscreenState();
}

function setupQueryPanelToggle() {
    const queryPanel = document.querySelector('.query-panel');
    const toggleButton = document.getElementById('query-panel-toggle');

    if (!queryPanel || !toggleButton) return;

    toggleButton.addEventListener('click', () => {
        const collapsed = queryPanel.classList.toggle('collapsed');
        toggleButton.textContent = collapsed ? 'Expand' : 'Collapse';
        toggleButton.setAttribute('aria-expanded', String(!collapsed));
        window.dispatchEvent(new Event('resize'));
    });
}

function setupResizableLayout() {
    const appContainer = document.getElementById('app-container');
    const mainContent = document.getElementById('main-content');
    const buttonContainer = document.getElementById('button-container');
    const verticalSplitter = document.getElementById('vertical-splitter');
    const horizontalSplitter = document.getElementById('horizontal-splitter');

    if (!appContainer || !mainContent || !buttonContainer || !verticalSplitter || !horizontalSplitter) {
        return;
    }

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const applyVerticalSplit = (clientX) => {
        const rect = mainContent.getBoundingClientRect();
        const nextWidth = clamp(clientX - rect.left, 260, rect.width - 320);
        appContainer.style.setProperty('--layout-sidebar', `${Math.round(nextWidth)}px`);
    };

    const applyHorizontalSplit = (clientY) => {
        const appRect = appContainer.getBoundingClientRect();
        const controlsHeight = buttonContainer.getBoundingClientRect().height;
        const mainRect = mainContent.getBoundingClientRect();
        const maxDataHeight = Math.max(mainRect.height - 240, 210);
        const minTop = appRect.top + 240;
        const maxTop = appRect.bottom - controlsHeight - 210;
        const splitTop = clamp(clientY, minTop, maxTop);
        const nextHeight = clamp(mainRect.bottom - splitTop, 210, maxDataHeight);
        appContainer.style.setProperty('--layout-data', `${Math.round(nextHeight)}px`);
    };

    const startDrag = (splitter, onMove) => (event) => {
        if (document.fullscreenElement === appContainer) return;
        event.preventDefault();
        splitter.classList.add('dragging');

        const handleMove = (moveEvent) => {
            onMove(moveEvent);
            window.dispatchEvent(new Event('resize'));
        };

        const handleUp = () => {
            splitter.classList.remove('dragging');
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
        };

        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp, { once: true });
    };

    verticalSplitter.addEventListener('pointerdown', startDrag(verticalSplitter, (event) => {
        applyVerticalSplit(event.clientX);
    }));

    horizontalSplitter.addEventListener('pointerdown', startDrag(horizontalSplitter, (event) => {
        applyHorizontalSplit(event.clientY);
    }));
}

async function init() {
    try {
        console.groupCollapsed("Initialization started");
        showLoadingIndicator();

        // 1. Get container
        const container = document.getElementById('graphics-container');
        console.log("1. Container:", container);
        if (!container) throw new Error("Graphics container not found");

        // 2. Create scene objects
        console.log("2. Creating scene objects...");
        sceneObjects = createScene(container);
        console.log("Scene objects created:", {
            scene: sceneObjects?.scene,
            camera: sceneObjects?.camera,
            renderer: sceneObjects?.renderer,
            canvas: sceneObjects?.renderer?.domElement,
            canvasDimensions: sceneObjects?.renderer?.domElement 
                ? `${sceneObjects.renderer.domElement.width}x${sceneObjects.renderer.domElement.height}`
                : 'N/A',
            canvasInDOM: container.contains(sceneObjects?.renderer?.domElement)
        });

        if (!sceneObjects) throw new Error("Scene initialization failed");

        // 3. Add debug objects
        console.log("3. Adding debug objects...");
        const axesHelper = new THREE.AxesHelper(5);
        sceneObjects.scene.add(axesHelper);
        const gridHelper = new THREE.GridHelper(10, 10);
        sceneObjects.scene.add(gridHelper);
        const testCube = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        sceneObjects.scene.add(testCube);
        console.log("Debug objects added:", sceneObjects.scene.children);

        // 4. Initialize cube manager
        console.log("4. Initializing cube manager...");
        initCubeManager(sceneObjects.scene, sceneObjects.camera);
        
        // 5. Load data
        console.log("5. Loading data...");
        const savedWorkspace = await loadWorkspaceSnapshot();
        let data;
        if (savedWorkspace?.data?.length) {
            data = savedWorkspace.data;
            screeningState = {
                ...screeningState,
                ...(savedWorkspace.screeningState || {})
            };
            setData(data);
            currentData = data;
        } else {
            data = await loadData("pubmed_data.csv");
            screeningState.totalRows = data.length;
        }
        console.log("Data loaded, first item:", data?.[0]);
        if (!data?.length) throw new Error("No data loaded");
        setData(data);
        currentData = data;
        renderFullscreenBrowseList(data);
        
        // 6. Create cubes
        console.log("6. Creating cubes...");
        const cubes = createCubesFromData(data, sceneObjects.scene);
        console.log(`Created ${cubes.length} cubes`, cubes);
        
        // 7. Setup selection callback
        console.log("7. Setting up selection callback...");
        const onSelectCallback = (newSelectedCubes, newLastSelectedCube) => {
            console.log("Selection changed:", {
                newSelectedCount: newSelectedCubes.length,
                newLastSelected: newLastSelectedCube?.userData?.PMID
            });
            selectedCubes = newSelectedCubes;
            lastSelectedCube = newLastSelectedCube;
            if (newLastSelectedCube) {
                updateTextZone(newLastSelectedCube.userData);
            }
            renderFullscreenBrowseList(currentData);
            // Update event handlers with new selection state
            setupEventHandlers(selectedCubes, lastSelectedCube, sceneObjects.scene);
        };
        selectionHandler = onSelectCallback;
        
        // 8. Setup UI
        console.log("8. Setting up UI...");
        setupUI(data, () => [...selectedCubes], () => lastSelectedCube, onSelectCallback);
        setupControlGroups();
        setupQueryPanel();
        setupQueryPanelToggle();
        setupFullscreenMode();
        setupResizableLayout();
        setSortButtonState(window.PositionModes?.GRID || 'grid');
        setScaleButtonState(GeometryScaleModes.NONE);
        
        // 9. Setup controls
        console.log("9. Setting up controls...");
        const controlsResult = setupControls(
            sceneObjects.camera,
            sceneObjects.renderer,
            sceneObjects.scene,
            onSelectCallback
        );
        console.log("Controls result structure:", {
            controls: !!controlsResult.controls,
            updateControls: !!controlsResult.updateControls,
            dispose: !!controlsResult.dispose
        });
        sceneObjects.controls = controlsResult.controls;
        sceneObjects.updateControls = controlsResult.updateControls;
        
        // 10. Start everything
        console.log("10. Starting animation loop...");

        try {
            setupEventHandlers(selectedCubes, lastSelectedCube, sceneObjects.scene);
            console.log("UI setup complete");
        } catch (uiError) {
            console.error("UI setup failed:", uiError);
            throw new Error(`UI initialization failed: ${uiError.message}`);
        }
        
        startAnimationLoop();
        
        console.log("Initialization completed successfully");
        console.groupEnd();
        
    } catch (error) {
        console.error("Initialization failed:", error);
        console.log("Current state:", {
            sceneObjects,
            selectedCubes,
            lastSelectedCube,
            THREE: !!THREE,
            container: document.getElementById('graphics-container')
        });
        showErrorToUser(`Initialization failed: ${error.message}`);
        try {
            createFallbackScene();
        } catch (fallbackError) {
            console.error("Fallback scene failed:", fallbackError);
        }
    } finally {
        removeLoadingIndicator();
    }
}
function startAnimationLoop() {
    if (!sceneObjects) {
        console.error("Cannot start animation - sceneObjects is null");
        return;
    }
    
    let lastTime = performance.now();
    let frameCount = 0;
    
    function animate(currentTime) {
        frameCount++;
        requestAnimationFrame(animate);
        
        // Calculate actual delta time in seconds
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        
        // Debug logging
        if (frameCount % 100 === 0) { // Log every 100 frames
            console.groupCollapsed(`Frame ${frameCount} Update`);
            console.log("Delta time:", deltaTime);
            console.log("Controls available:", !!sceneObjects.controls);
            console.log("Update function available:", !!sceneObjects.updateControls);
            
            if (sceneObjects.controls && sceneObjects.updateControls) {
                console.log("Calling updateControls with delta:", deltaTime);
                sceneObjects.updateControls(deltaTime);
                console.log("Camera position after update:", sceneObjects.camera.position);
            }
            
            console.groupEnd();
        } else {
            // Normal operation without logging
            if (sceneObjects.controls && sceneObjects.updateControls) {
                sceneObjects.updateControls(deltaTime);
            }
        }
        
        sceneObjects.renderer.render(sceneObjects.scene, sceneObjects.camera);
    }
    
    console.log("Starting animation loop");
    animate(performance.now());
}













// Rest of your code (setupEventHandlers etc.) remains unchanged
init();
// script.js end
