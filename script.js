import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { initAuth, setupAuthEventListeners, handleLogout } from './js/auth.js';
import { updateFooterText, showAuthViewUI, showAppViewUI, showSheetListViewUI, showPdfViewUI, initFab, initErrorPopupListener } from './js/ui.js';
import { 
    initSheetLogic, 
    updateUserIdForSheets, 
    populateAbilityScores, 
    populateSavingThrows, 
    populateSkills, 
    openSheetEditor, 
    setupSheetEventListeners, 
    loadCharacterSheets, 
    calculateAllSheetBonuses
} from './js/sheet_logic.js';
import { initPdfViewer, getCurrentPdfDoc } from './js/pdf_viewer.js';


console.log("Cult Club: script.js (principal) carregado e iniciando...");

const userProvidedFirebaseConfig = {
    apiKey: "AIzaSyB5W-V72Y9uQlYUfXARcTB1yXTbN82T6F0",
    authDomain: "cultclub-5042d.firebaseapp.com",
    projectId: "cultclub-5042d",
    storageBucket: "cultclub-5042d.appspot.com",
    messagingSenderId: "473117369075",
    appId: "1:473117369075:web:d55451585c031532118d86",
    measurementId: "G-SXJGR7QXRL"
};

let effectiveFirebaseConfig;
let configSource;

if (typeof __firebase_config !== 'undefined' && __firebase_config !== '{}' && __firebase_config.trim() !== '') {
    try {
        effectiveFirebaseConfig = JSON.parse(__firebase_config);
        configSource = "Ambiente (__firebase_config)";
    } catch (e) {
        console.warn("Cult Club: Falha ao parsear __firebase_config. Usando fallback.", e);
        effectiveFirebaseConfig = userProvidedFirebaseConfig;
        configSource = "Fallback (userProvidedFirebaseConfig) após erro no parse";
    }
} else {
    effectiveFirebaseConfig = userProvidedFirebaseConfig;
    configSource = "Fallback (userProvidedFirebaseConfig)";
}

console.log(`Cult Club: Usando Firebase config de: ${configSource}`);
console.log("Cult Club: Firebase Project ID em uso:", effectiveFirebaseConfig.projectId);

const appIdForFirestorePath = typeof __app_id !== 'undefined' ? __app_id : 'cult-club-dnd-sheets-local';

const firebaseApp = initializeApp(effectiveFirebaseConfig);
const db = getFirestore(firebaseApp);
setLogLevel('debug');

function handleAuthStateChange(newUserId, isLoggedIn) {
    updateUserIdForSheets(newUserId); 

    if (isLoggedIn) {
        showAppViewUI(loadCharacterSheets); 
    } else {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        showAuthViewUI(loginForm, registerForm, () => {});
    }
}

function initApp() {
    console.log("Cult Club: initApp (principal) começando...");

    initAuth(firebaseApp, handleAuthStateChange); 
    initSheetLogic(db, appIdForFirestorePath); 
    initPdfViewer();
    initFab(showSheetListViewUI, () => showPdfViewUI(getCurrentPdfDoc())); 
    initErrorPopupListener();

    populateAbilityScores(); 
    populateSavingThrows();
    populateSkills();
    
    updateFooterText();

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterBtn = document.getElementById('show-register-form-btn');
    const showLoginBtn = document.getElementById('show-login-form-btn');
    setupAuthEventListeners(loginForm, registerForm, showRegisterBtn, showLoginBtn);

    const logoutBtnFooterEl = document.getElementById('logout-btn-footer');
    if (logoutBtnFooterEl) {
        logoutBtnFooterEl.addEventListener('click', () => {
            handleLogout(() => { 
                const fabMainButton = document.getElementById('fab-main-button');
                const fabMenu = document.getElementById('fab-menu');
                if (fabMainButton && fabMenu && fabMainButton.classList.contains('active')) {
                    fabMenu.classList.remove('active');
                    fabMenu.classList.add('hidden');
                    fabMainButton.classList.remove('active');
                    const iconElement = fabMainButton.querySelector('i');
                    if(iconElement) iconElement.outerHTML = '<i data-lucide="grip" class="w-7 h-7"></i>';
                    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [fabMainButton] });
                }
            });
        });
    }
    
    const closeEditorBtn = document.getElementById('close-editor-btn');
    const createNewSheetBtn = document.getElementById('create-new-sheet-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const classLevelInputEl = document.getElementById('classLevel');
    const cancelDeleteSheetBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteSheetBtn = document.getElementById('confirm-delete-btn');
    setupSheetEventListeners(closeEditorBtn, createNewSheetBtn, cancelEditBtn, classLevelInputEl, cancelDeleteSheetBtn, confirmDeleteSheetBtn);
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    console.log("Cult Club: initApp (principal) concluída.");
}

document.addEventListener('DOMContentLoaded', initApp);