// script.js start
import * as THREE from 'three';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { createScene } from './createScene.js';
import { createUI, setupUI, showLoadingIndicator, removeLoadingIndicator, showErrorToUser, clearTextZone, createFallbackScene } from './uiManager.js';
import { loadData, populateDataTable, updateTextZone, getData, setData, addAnnotation } from './dataManager.js';
import { createCubesFromData, getCubes, highlightCubeByPmid, centerCameraOnCube, initCubeManager, deleteSelectedCubes } from './cubeManager.js';
import { hidePubMedFetchOverlay } from './pubmedOverlay.js';
import { deleteSelectedFromData } from './deleteCubes.js';
import { exportFilteredData } from './saveCubes.js';
import { setupControls } from './controlsSetup.js';
import { setupEventHandlers } from './eventHandlers.js';
import { setGeometryScaleMode, GeometryScaleModes } from './createCube.js';
import { fetchPubMedData, DEFAULT_API_KEY } from './pubmedFetcher.js';

let sceneObjects = null;
let selectedCubes = [];
let lastSelectedCube = null;
let currentData = [];
let selectionHandler = null;

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

function refreshCubesFromCurrentData() {
    if (!sceneObjects?.scene || !currentData?.length) return;
    createCubesFromData(currentData, sceneObjects.scene);
    renderFullscreenBrowseList(currentData);
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
        refreshCubesFromCurrentData();
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
}

function setupQueryPanel() {
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
        } catch (error) {
            console.error('Query-to-CSV failed:', error);
            showErrorToUser(`PubMed query failed: ${error.message}`);
            if (queryStatus) queryStatus.textContent = 'Failed. Check API key/search term and try again.';
        } finally {
            removeLoadingIndicator();
        }
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
        let data;
        data = await loadData("pubmed_data.csv");
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
