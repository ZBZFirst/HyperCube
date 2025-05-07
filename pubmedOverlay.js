// pubmedOverlay.js
import { fetchPubMedData, DEFAULT_API_KEY } from './pubmedFetcher.js';

export function showPubMedFetchOverlay() {
  const overlay = createOverlayElement();
  document.body.appendChild(overlay);
  addOverlayStyles();
  return overlay;
}

export function hidePubMedFetchOverlay() {
  const overlay = document.getElementById('pubmed-fetch-overlay');
  if (overlay) overlay.remove();
  removeSpinAnimation();
}

function createOverlayElement() {
  const overlay = document.createElement('div');
  overlay.id = 'pubmed-fetch-overlay';
  overlay.className = 'pubmed-overlay';
  
  overlay.appendChild(createModalElement());
  return overlay;
}

function createModalElement() {
  const modal = document.createElement('div');
  modal.className = 'pubmed-modal';
  
  modal.appendChild(createTitleElement());
  modal.appendChild(createFormElement());
  
  return modal;
}

function createTitleElement() {
  const title = document.createElement('h2');
  title.className = 'modal-title';
  title.textContent = 'Fetch PubMed Data';
  return title;
}

function createFormElement() {
  const form = document.createElement('form');
  form.className = 'pubmed-form';
  
  form.appendChild(createSearchInputGroup());
  form.appendChild(createApiKeyInputGroup());
  form.appendChild(createButtonGroup());
  form.appendChild(createSpinnerElement());
  
  return form;
}

function createSearchInputGroup() {
  return createFormGroup(
    'Search Term:', 
    'pubmed-search-term', 
    'text', 
    'Liquid Mechanical Ventilation Life Support Humans'
  );
}

function createApiKeyInputGroup() {
  return createFormGroup(
    'PubMed API Key (optional):', 
    'pubmed-api-key', 
    'text', 
    '', 
    'Error will occur if key left blank, Sign Up at PubMed.Gov for a Free API Key'
  );
}

function createButtonGroup() {
  const group = document.createElement('div');
  group.className = 'button-group';
  
  group.appendChild(createButton('Fetch from PubMed', 'primary', handleFetch));
  group.appendChild(createButton('Load from CSV', 'secondary', hidePubMedFetchOverlay));
  
  return group;
}

function createSpinnerElement() {
  const spinner = document.createElement('div');
  spinner.className = 'spinner';
  spinner.style.display = 'none';
  return spinner;
}

function createFormGroup(labelText, id, type, value, placeholder = '') {
  const group = document.createElement('div');
  group.className = 'form-group';
  
  const label = document.createElement('label');
  label.textContent = labelText;
  label.htmlFor = id;
  
  const input = document.createElement('input');
  input.type = type;
  input.id = id;
  input.value = value;
  input.placeholder = placeholder;
  
  group.append(label, input);
  return group;
}

function createButton(text, variant, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `btn btn-${variant}`;
  btn.textContent = text;
  btn.addEventListener('click', onClick);
  return btn;
}

async function handleFetch() {
  const fetchBtn = document.querySelector('.pubmed-modal .btn-primary');
  const spinner = document.querySelector('.pubmed-modal .spinner');
  const searchInput = document.getElementById('pubmed-search-term');
  const apiKeyInput = document.getElementById('pubmed-api-key');
  
  fetchBtn.disabled = true;
  spinner.style.display = 'block';
  
  try {
    const searchTerm = searchInput.value.trim();
    const apiKey = apiKeyInput.value.trim() || DEFAULT_API_KEY;
    
    if (!searchTerm) throw new Error('Please enter a search term');
    
    return await fetchPubMedData(searchTerm, apiKey);
  } catch (error) {
    showErrorInModal(error.message);
    throw error;
  } finally {
    spinner.style.display = 'none';
    fetchBtn.disabled = false;
  }
}

function showErrorInModal(message) {
  const modal = document.querySelector('.pubmed-modal');
  const existingError = modal.querySelector('.error-message');
  if (existingError) existingError.remove();
  
  const errorEl = document.createElement('p');
  errorEl.className = 'error-message';
  errorEl.textContent = message;
  errorEl.style.color = '#ff6b6b';
  errorEl.style.marginTop = '10px';
  
  modal.querySelector('form').appendChild(errorEl);
}

function addOverlayStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .pubmed-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0,0,0,0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      padding: 20px;
      box-sizing: border-box;
    }
    
    .pubmed-modal {
      background: #2d3436;
      border-radius: 8px;
      padding: 30px;
      width: 100%;
      max-width: 500px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      animation: modalFadeIn 0.3s ease-out;
    }
    
    .modal-title {
      color: #f5f6fa;
      margin-top: 0;
      margin-bottom: 20px;
      text-align: center;
    }
    
    .pubmed-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .form-group label {
      color: #dfe6e9;
      font-size: 14px;
    }
    
    .form-group input {
      padding: 12px 15px;
      border: 1px solid #636e72;
      border-radius: 4px;
      background: #3d484d;
      color: white;
      font-size: 16px;
    }
    
    .form-group input:focus {
      outline: none;
      border-color: #0984e3;
    }
    
    .button-group {
      display: flex;
      gap: 10px;
      margin-top: 10px;
    }
    
    .btn {
      padding: 12px 20px;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
      flex: 1;
      transition: all 0.2s;
    }
    
    .btn-primary {
      background: #0984e3;
      color: white;
    }
    
    .btn-primary:hover {
      background: #0779cf;
    }
    
    .btn-primary:disabled {
      background: #636e72;
      cursor: not-allowed;
    }
    
    .btn-secondary {
      background: #3d484d;
      color: white;
    }
    
    .btn-secondary:hover {
      background: #2d3436;
    }
    
    .spinner {
      border: 3px solid rgba(255,255,255,0.1);
      border-top: 3px solid #0984e3;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    @keyframes modalFadeIn {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  
  document.head.appendChild(style);
}

function removeSpinAnimation() {
  const styles = document.querySelectorAll('style');
  styles.forEach(style => {
    if (style.textContent.includes('spin')) style.remove();
  });
}
