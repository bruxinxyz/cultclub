const authView = document.getElementById('auth-view');
const appContainer = document.getElementById('app-container');
const bodyContainer = document.getElementById('body-container'); 
const successPopup = document.getElementById('success-popup');
const errorPopup = document.getElementById('error-popup');
const closeErrorPopupBtn = document.getElementById('close-error-popup-btn');
const authFooterNoteEl = document.getElementById('auth-footer-note');
const appFooterNoteEl = document.getElementById('app-footer-note');
const logoutBtnFooter = document.getElementById('logout-btn-footer');

const sheetListView = document.getElementById('sheet-list-view');
const sheetEditorView = document.getElementById('sheet-editor-view');
const pdfViewerView = document.getElementById('pdf-viewer-view');

const fabContainer = document.getElementById('fab-container');
const fabMainButton = document.getElementById('fab-main-button');
const fabMenu = document.getElementById('fab-menu');

export function updateFooterText() {
    const currentYear = new Date().getFullYear();
    const footerText = `© ${currentYear} Cult Project. Todos os direitos reservados.`;
    if (authFooterNoteEl) authFooterNoteEl.textContent = footerText;
    if (appFooterNoteEl) appFooterNoteEl.textContent = footerText;
}

export function showCustomPopup(popupElement, title, message, autoHideDelay = 3000, postHideCallback = null) {
    if (!popupElement) return;
    const popupTitleEl = popupElement.querySelector('.popup-title');
    const popupMessageEl = popupElement.querySelector('.popup-message');

    if (popupTitleEl) popupTitleEl.textContent = title;
    if (popupMessageEl) popupMessageEl.textContent = message;

    popupElement.classList.remove('hidden');
    requestAnimationFrame(() => {
        popupElement.classList.add('visible');
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();

    if (autoHideDelay > 0) {
        setTimeout(() => {
            popupElement.classList.remove('visible');
            setTimeout(() => {
                popupElement.classList.add('hidden');
                if (postHideCallback) {
                    postHideCallback();
                }
            }, 350);
        }, autoHideDelay);
    }
}

function hideAllMainViews() {
    if (sheetListView) sheetListView.classList.add('hidden');
    if (sheetEditorView) sheetEditorView.classList.add('hidden');
    if (pdfViewerView) pdfViewerView.classList.add('hidden');
}

export function showAuthViewUI(loginForm, registerForm, unsubscribeSheetsListenerFunc) {
    updateFooterText();
    if (authView) authView.classList.remove('hidden');
    if (appContainer) appContainer.classList.add('hidden');
    if (fabContainer) fabContainer.classList.add('hidden');
    if (bodyContainer) bodyContainer.classList.add('animated-background');
    if (logoutBtnFooter) logoutBtnFooter.classList.add('hidden');
    
    if (unsubscribeSheetsListenerFunc && typeof unsubscribeSheetsListenerFunc === 'function') {
        unsubscribeSheetsListenerFunc();
    }

    if (loginForm) loginForm.classList.remove('hidden');
    if (registerForm) registerForm.classList.add('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

export function showAppViewUI(loadCharacterSheetsFunc) {
    updateFooterText();
    if (authView) authView.classList.add('hidden');
    if (appContainer) appContainer.classList.remove('hidden');
    if (fabContainer) fabContainer.classList.remove('hidden');
    if (bodyContainer) bodyContainer.classList.remove('animated-background');
    
    hideAllMainViews();
    if (sheetListView) sheetListView.classList.remove('hidden');
    if (logoutBtnFooter) logoutBtnFooter.classList.remove('hidden'); 

    if (loadCharacterSheetsFunc && typeof loadCharacterSheetsFunc === 'function') {
        loadCharacterSheetsFunc();
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

export function showSheetListViewUI() {
    hideAllMainViews();
    if (sheetListView) sheetListView.classList.remove('hidden');
    if (logoutBtnFooter) logoutBtnFooter.classList.remove('hidden'); 
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

export function showSheetEditorUI() {
    hideAllMainViews();
    if (sheetEditorView) sheetEditorView.classList.remove('hidden');
    if (logoutBtnFooter) logoutBtnFooter.classList.add('hidden'); 
    if (sheetEditorView) sheetEditorView.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

export function showPdfViewUI(currentPdfDoc) {
    hideAllMainViews();
    if (pdfViewerView) pdfViewerView.classList.remove('hidden');
    if (logoutBtnFooter) logoutBtnFooter.classList.add('hidden');

    const pdfLoaderMessage = document.getElementById('pdf-loader-message');
    const pdfCanvas = document.getElementById('pdf-canvas');
    const pdfViewerControls = document.getElementById('pdf-viewer-controls');
    const pdfOverlayPrevPageBtn = document.getElementById('pdf-overlay-prev-page');
    const pdfOverlayNextPageBtn = document.getElementById('pdf-overlay-next-page');

    if (!currentPdfDoc) {
        if (pdfLoaderMessage) {
            pdfLoaderMessage.textContent = "Selecione um arquivo PDF para iniciar a leitura.";
            pdfLoaderMessage.classList.remove('hidden');
        }
        if (pdfCanvas) pdfCanvas.classList.add('hidden');
        if (pdfViewerControls) pdfViewerControls.classList.add('hidden');
        if (pdfOverlayPrevPageBtn) pdfOverlayPrevPageBtn.classList.add('hidden');
        if (pdfOverlayNextPageBtn) pdfOverlayNextPageBtn.classList.add('hidden');
    } else {
        if (pdfViewerControls) pdfViewerControls.classList.remove('hidden');
        if (pdfOverlayPrevPageBtn) pdfOverlayPrevPageBtn.classList.remove('hidden');
        if (pdfOverlayNextPageBtn) pdfOverlayNextPageBtn.classList.remove('hidden');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}


function toggleFabMenu() {
    if (!fabMenu || !fabMainButton) return;
    fabMenu.classList.toggle('active');
    fabMenu.classList.toggle('hidden');
    fabMainButton.classList.toggle('active');
    const iconElement = fabMainButton.querySelector('i');
    if (iconElement) {
        iconElement.outerHTML = fabMainButton.classList.contains('active') ? '<i data-lucide="x" class="w-7 h-7"></i>' : '<i data-lucide="grip" class="w-7 h-7"></i>';
        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [fabMainButton] });
    }
}

export function initFab(showSheetListFunc, showPdfViewerFunc) {
    if (fabMainButton) {
        fabMainButton.addEventListener('click', toggleFabMenu);
    }
    if (fabMenu) {
        fabMenu.addEventListener('click', (e) => {
            const targetButton = e.target.closest('.fab-menu-item');
            if (targetButton) {
                const targetViewId = targetButton.dataset.targetView;
                if (targetViewId === 'sheet-list-view' && typeof showSheetListFunc === 'function') {
                    showSheetListFunc();
                } else if (targetViewId === 'pdf-viewer-view' && typeof showPdfViewerFunc === 'function') {
                    showPdfViewerFunc();
                }
                toggleFabMenu();
            }
        });
    }
}

export function initErrorPopupListener() {
    if (closeErrorPopupBtn) {
        closeErrorPopupBtn.addEventListener('click', () => {
            if (errorPopup) {
                errorPopup.classList.remove('visible');
                setTimeout(() => errorPopup.classList.add('hidden'), 350);
            }
        });
    }
}

export { successPopup, errorPopup };