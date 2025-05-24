import { showCustomPopup } from './ui.js';
import { successPopup, errorPopup } from './ui.js';

const pdfFileInput = document.getElementById('pdf-file-input');
const pdfRenderWrapper = document.getElementById('pdf-render-wrapper');
const pdfCanvas = document.getElementById('pdf-canvas');
const pdfViewerControls = document.getElementById('pdf-viewer-controls');
const pdfPageNumEl = document.getElementById('pdf-page-num');
const pdfPageCountEl = document.getElementById('pdf-page-count');
const pdfLoaderMessage = document.getElementById('pdf-loader-message');
const pdfFullscreenBtn = document.getElementById('pdf-fullscreen-btn');
const pdfOverlayPrevPageBtn = document.getElementById('pdf-overlay-prev-page');
const pdfOverlayNextPageBtn = document.getElementById('pdf-overlay-next-page');

let currentPdfDoc = null;
let currentPageNum = 1;
let currentBaseScale = 1.5;
let touchstartX = 0;
let touchendX = 0;
const SWIPE_THRESHOLD = 50;

function calculateOptimalBaseScale(page, containerWidth, containerHeight) {
    const viewport = page.getViewport({ scale: 1 });
    const scaleX = containerWidth / viewport.width;
    const scaleY = containerHeight / viewport.height;
    return Math.min(scaleX, scaleY, 3.0); 
}

async function renderPdfPage(pageNumToRender, pdfDocumentToRender = currentPdfDoc) {
    if (!pdfDocumentToRender || !pdfCanvas || !pdfPageNumEl || !pdfOverlayPrevPageBtn || !pdfOverlayNextPageBtn || !pdfLoaderMessage || !pdfRenderWrapper || !pdfViewerControls) return;

    try {
        const page = await pdfDocumentToRender.getPage(pageNumToRender);
        const dpr = window.devicePixelRatio || 1;

        let targetRenderWidth = pdfRenderWrapper.clientWidth;
        let targetRenderHeight = pdfRenderWrapper.clientHeight;

        if (document.fullscreenElement === pdfRenderWrapper) {
            targetRenderWidth = window.innerWidth;
            targetRenderHeight = window.innerHeight;
        }
        
        targetRenderWidth -= 20; 
        targetRenderHeight -= 20;

        currentBaseScale = calculateOptimalBaseScale(page, targetRenderWidth, targetRenderHeight);
        
        const viewportScale = currentBaseScale * dpr;
        const viewport = page.getViewport({ scale: viewportScale });
        
        const canvasContext = pdfCanvas.getContext('2d');
        pdfCanvas.height = viewport.height;
        pdfCanvas.width = viewport.width;
        pdfCanvas.style.height = `${viewport.height / dpr}px`;
        pdfCanvas.style.width = `${viewport.width / dpr}px`;

        const renderContext = { canvasContext, viewport };
        await page.render(renderContext).promise;

        currentPageNum = pageNumToRender;
        if (pdfPageNumEl) pdfPageNumEl.textContent = currentPageNum;
        if (pdfPageCountEl) pdfPageCountEl.textContent = pdfDocumentToRender.numPages;

        const isFirstPage = currentPageNum <= 1;
        const isLastPage = currentPageNum >= pdfDocumentToRender.numPages;

        if (pdfOverlayPrevPageBtn) pdfOverlayPrevPageBtn.disabled = isFirstPage;
        if (pdfOverlayNextPageBtn) pdfOverlayNextPageBtn.disabled = isLastPage;

        if (pdfLoaderMessage) pdfLoaderMessage.classList.add('hidden');
        if (pdfCanvas) pdfCanvas.classList.remove('hidden');
        if (pdfViewerControls) pdfViewerControls.classList.remove('hidden');
        if (pdfOverlayPrevPageBtn) pdfOverlayPrevPageBtn.classList.remove('hidden');
        if (pdfOverlayNextPageBtn) pdfOverlayNextPageBtn.classList.remove('hidden');

    } catch (error) {
        console.error("Erro ao renderizar página do PDF:", error);
        if (pdfLoaderMessage) {
            pdfLoaderMessage.textContent = "Erro ao carregar página do PDF.";
            pdfLoaderMessage.classList.remove('hidden');
        }
        if (pdfCanvas) pdfCanvas.classList.add('hidden');
        if (pdfViewerControls) pdfViewerControls.classList.add('hidden');
        if (pdfOverlayPrevPageBtn) pdfOverlayPrevPageBtn.classList.add('hidden');
        if (pdfOverlayNextPageBtn) pdfOverlayNextPageBtn.classList.add('hidden');
        showCustomPopup(errorPopup, "Erro no Oráculo", "Falha ao renderizar página do PDF.", 3000);
    }
}

function changePdfPage(delta) {
    if (!currentPdfDoc) return;
    const newPageNum = currentPageNum + delta;
    if (newPageNum > 0 && newPageNum <= currentPdfDoc.numPages) {
        renderPdfPage(newPageNum);
    }
}

async function loadPdfFromArrayBuffer(arrayBuffer) {
    if (!pdfLoaderMessage || !pdfCanvas || !pdfViewerControls || !pdfOverlayPrevPageBtn || !pdfOverlayNextPageBtn || !pdfPageCountEl) return;
    pdfLoaderMessage.textContent = "Processando seu pergaminho...";
    pdfLoaderMessage.classList.remove('hidden');
    pdfCanvas.classList.add('hidden');
    pdfViewerControls.classList.add('hidden');
    pdfOverlayPrevPageBtn.classList.add('hidden');
    pdfOverlayNextPageBtn.classList.add('hidden');
    try {
        currentPdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (pdfPageCountEl) pdfPageCountEl.textContent = currentPdfDoc.numPages;
        currentPageNum = 1;
        renderPdfPage(currentPageNum, currentPdfDoc);
        showCustomPopup(successPopup, "Pergaminho Decifrado!", "Seu PDF foi carregado com sucesso.", 2500);
    } catch (error) {
        console.error("Erro ao carregar PDF do ArrayBuffer:", error);
        currentPdfDoc = null;
        if (pdfLoaderMessage) pdfLoaderMessage.textContent = "Falha ao carregar o PDF. O arquivo pode estar corrompido ou ser inválido.";
        showCustomPopup(errorPopup, "Falha na Leitura", `Não foi possível ler o arquivo PDF: ${error.message}`, 4000);
    }
}

function handleSwipeGesture() {
    if (!currentPdfDoc) return;
    if (document.fullscreenElement !== pdfRenderWrapper && Math.abs(window.innerWidth - document.documentElement.clientWidth) > 10) {
        if (document.fullscreenElement !== pdfRenderWrapper) return;
    }
    const deltaX = touchendX - touchstartX;
    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
        if (pdfCanvas) pdfCanvas.classList.add('swiping');
        if (deltaX < 0) changePdfPage(1);
        else changePdfPage(-1);
        setTimeout(() => { if (pdfCanvas) pdfCanvas.classList.remove('swiping'); }, 200);
    }
}

export function initPdfViewer() {

    if (pdfLoaderMessage) {
        pdfLoaderMessage.textContent = "Selecione um arquivo PDF para iniciar a leitura.";
        pdfLoaderMessage.classList.remove('hidden');
    }
    if (pdfCanvas) pdfCanvas.classList.add('hidden');
    if (pdfViewerControls) pdfViewerControls.classList.add('hidden');
    if (pdfOverlayPrevPageBtn) pdfOverlayPrevPageBtn.classList.add('hidden');
    if (pdfOverlayNextPageBtn) pdfOverlayNextPageBtn.classList.add('hidden');
    
    if (pdfFileInput) {
        pdfFileInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (file && file.type === "application/pdf") {
                if (pdfLoaderMessage) {
                    pdfLoaderMessage.textContent = "Lendo seu pergaminho local...";
                    pdfLoaderMessage.classList.remove('hidden');
                }
                if (pdfCanvas) pdfCanvas.classList.add('hidden');
                if (pdfViewerControls) pdfViewerControls.classList.add('hidden');
                if (pdfOverlayPrevPageBtn) pdfOverlayPrevPageBtn.classList.add('hidden');
                if (pdfOverlayNextPageBtn) pdfOverlayNextPageBtn.classList.add('hidden');

                const fileReader = new FileReader();
                fileReader.onload = function() {
                    const typedarray = new Uint8Array(this.result);
                    loadPdfFromArrayBuffer(typedarray);
                };
                fileReader.readAsArrayBuffer(file);
            } else {
                currentPdfDoc = null;
                if (pdfLoaderMessage) {
                    pdfLoaderMessage.textContent = "Tipo de arquivo inválido. Por favor, selecione um PDF.";
                    pdfLoaderMessage.classList.remove('hidden');
                }
                if (pdfCanvas) pdfCanvas.classList.add('hidden');
                if (pdfViewerControls) pdfViewerControls.classList.add('hidden');
                if (pdfOverlayPrevPageBtn) pdfOverlayPrevPageBtn.classList.add('hidden');
                if (pdfOverlayNextPageBtn) pdfOverlayNextPageBtn.classList.add('hidden');
                if (file) {
                    showCustomPopup(errorPopup, "Formato Incorreto", "Apenas arquivos PDF são permitidos.", 3000);
                }
            }
            pdfFileInput.value = '';
        });
    }

    if (pdfOverlayPrevPageBtn) pdfOverlayPrevPageBtn.addEventListener('click', () => changePdfPage(-1));
    if (pdfOverlayNextPageBtn) pdfOverlayNextPageBtn.addEventListener('click', () => changePdfPage(1));

    if (pdfFullscreenBtn && pdfRenderWrapper) {
        pdfFullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                pdfRenderWrapper.requestFullscreen().catch(err => {
                    showCustomPopup(errorPopup, "Erro na Imersão", `Não foi possível ativar tela cheia: ${err.message}`, 3000);
                });
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
            }
        });
        document.addEventListener('fullscreenchange', () => {
            if (pdfRenderWrapper && pdfFullscreenBtn) {
                const icon = pdfFullscreenBtn.querySelector('i');
                const isInFullscreen = document.fullscreenElement === pdfRenderWrapper;
                pdfRenderWrapper.classList.toggle('fullscreen-active', isInFullscreen);
                if (icon) icon.outerHTML = isInFullscreen ? '<i data-lucide="minimize" class="mr-2"></i>' : '<i data-lucide="maximize" class="mr-2"></i>';
                if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [pdfFullscreenBtn] });
                if (currentPdfDoc) renderPdfPage(currentPageNum, currentPdfDoc);
            }
        });
    }

    if (pdfRenderWrapper) {
        pdfRenderWrapper.addEventListener('touchstart', e => { touchstartX = e.changedTouches[0].screenX; }, { passive: true });
        pdfRenderWrapper.addEventListener('touchend', e => { touchendX = e.changedTouches[0].screenX; handleSwipeGesture(); });
    }
}

export function getCurrentPdfDoc() {
    return currentPdfDoc;
}