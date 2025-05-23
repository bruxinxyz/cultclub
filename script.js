// Importações do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    doc, 
    setDoc, 
    deleteDoc,
    onSnapshot,
    setLogLevel
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

console.log("Cult Club: script.js carregado e iniciando...");

const userProvidedFirebaseConfig = {
    apiKey: "AIzaSyB5W-V72Y9uQlYUfXARcTB1yXTbN82T6F0", 
    authDomain: "cultclub-5042d.firebaseapp.com",
    projectId: "cultclub-5042d",
    storageBucket: "cultclub-5042d.firebasestorage.app",
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

const app = initializeApp(effectiveFirebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
setLogLevel('debug'); 

let userId = null;
let currentEditingSheetId = null;
let unsubscribeSheetsListener = null; 

const authView = document.getElementById('auth-view');
const appContainer = document.getElementById('app-container');
const bodyContainer = document.getElementById('body-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginErrorEl = document.getElementById('login-error');
const registerErrorEl = document.getElementById('register-error');
const authCardContainer = document.getElementById('auth-card-container');
const showRegisterFormBtn = document.getElementById('show-register-form-btn');
const showLoginFormBtn = document.getElementById('show-login-form-btn');
const authFooterNoteEl = document.getElementById('auth-footer-note'); 
const appFooterNoteEl = document.getElementById('app-footer-note'); 

const logoutBtnFooter = document.getElementById('logout-btn-footer'); 

const sheetListView = document.getElementById('sheet-list-view');
const sheetEditorView = document.getElementById('sheet-editor-view');
const createNewSheetBtn = document.getElementById('create-new-sheet-btn');
const closeEditorBtn = document.getElementById('close-editor-btn');
const characterSheetForm = document.getElementById('character-sheet-form');
const characterSheetsGrid = document.getElementById('character-sheets-grid');
const noSheetsMessage = document.getElementById('no-sheets-message');
const editorTitle = document.getElementById('editor-title');
const authStatusEl = document.getElementById('auth-status');

const deleteConfirmModal = document.getElementById('delete-confirm-modal');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
let sheetIdToDelete = null;

const successPopup = document.getElementById('success-popup');
const errorPopup = document.getElementById('error-popup');
const closeErrorPopupBtn = document.getElementById('close-error-popup-btn');

const ABILITIES = {
    strength: "Força", dexterity: "Destreza", constitution: "Constituição",
    intelligence: "Inteligência", wisdom: "Sabedoria", charisma: "Carisma"
};
const SKILLS = {
    acrobatics: { name: "Acrobacia", ability: "dexterity" }, animalHandling: { name: "Adestrar Animais", ability: "wisdom" },
    arcana: { name: "Arcanismo", ability: "intelligence" }, athletics: { name: "Atletismo", ability: "strength" },
    deception: { name: "Enganação", ability: "charisma" }, history: { name: "História", ability: "intelligence" },
    insight: { name: "Intuição", ability: "wisdom" }, intimidation: { name: "Intimidação", ability: "charisma" },
    investigation: { name: "Investigação", ability: "intelligence" }, medicine: { name: "Medicina", ability: "wisdom" },
    nature: { name: "Natureza", ability: "intelligence" }, perception: { name: "Percepção", ability: "wisdom" },
    performance: { name: "Atuação", ability: "charisma" }, persuasion: { name: "Persuasão", ability: "charisma" },
    religion: { name: "Religião", ability: "intelligence" }, sleightOfHand: { name: "Prestidigitação", ability: "dexterity" },
    stealth: { name: "Furtividade", ability: "dexterity" }, survival: { name: "Sobrevivência", ability: "wisdom" }
};

if (authCardContainer) {
    authCardContainer.addEventListener('mousemove', (e) => {
        const card = authCardContainer.querySelector('.auth-card');
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const rotateY = (x / (rect.width / 2)) * 8; 
        const rotateX = -(y / (rect.height / 2)) * 8; 
        card.style.setProperty('--rotateX', `${rotateX}deg`);
        card.style.setProperty('--rotateY', `${rotateY}deg`);
    });
    authCardContainer.addEventListener('mouseleave', () => {
        const card = authCardContainer.querySelector('.auth-card');
        if (!card) return;
        card.style.setProperty('--rotateX', '0deg');
        card.style.setProperty('--rotateY', '0deg');
        card.style.transform = 'rotateY(0) rotateX(0) translateZ(0) scale(1)'; 
    });
}

function updateFooterText() {
    const currentYear = new Date().getFullYear();
    const footerText = `© ${currentYear} Cult Club. Todos os direitos reservados.`;
    if (authFooterNoteEl) authFooterNoteEl.textContent = footerText;
    if (appFooterNoteEl) appFooterNoteEl.textContent = footerText;
}

function showAuthView() {
    console.log("Cult Club: Exibindo Auth View");
    updateFooterText(); 
    authView.classList.remove('hidden');
    appContainer.classList.add('hidden');
    bodyContainer.classList.add('animated-background');
    if (logoutBtnFooter) logoutBtnFooter.classList.add('hidden'); // Esconde o botão de logout da app
    if (unsubscribeSheetsListener) {
        unsubscribeSheetsListener();
        unsubscribeSheetsListener = null;
    }
    loginForm.classList.remove('hidden'); 
    registerForm.classList.add('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function showAppView() {
    console.log("Cult Club: Exibindo App View");
    updateFooterText(); 
    authView.classList.add('hidden');
    appContainer.classList.remove('hidden');
    bodyContainer.classList.remove('animated-background'); 
    if (logoutBtnFooter) logoutBtnFooter.classList.remove('hidden'); // Mostra o botão de logout da app
    loadCharacterSheets();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

showRegisterFormBtn.addEventListener('click', () => {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons(); 
});

showLoginFormBtn.addEventListener('click', () => {
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons(); 
});

function showCustomPopup(popupElement, title, message, autoHideDelay = 3000, postHideCallback = null) {
    console.log(`Cult Club: showCustomPopup chamada para '${popupElement.id}' com:`, title, message);
    const popupTitleEl = popupElement.querySelector('.popup-title');
    const popupMessageEl = popupElement.querySelector('.popup-message');
    
    if (popupTitleEl) popupTitleEl.textContent = title;
    if (popupMessageEl) popupMessageEl.textContent = message;
    
    popupElement.classList.remove('hidden');
    requestAnimationFrame(() => { 
        popupElement.classList.add('visible');
        console.log(`Cult Club: Popup ${popupElement.id} tornou-se visível.`);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons(); 

    if (autoHideDelay > 0) {
        setTimeout(() => {
            console.log(`Cult Club: Primeiro setTimeout do popup ${popupElement.id} (para esconder).`);
            popupElement.classList.remove('visible');
            setTimeout(() => { 
                console.log(`Cult Club: Segundo setTimeout do popup ${popupElement.id} (para ocultar e chamar callback).`);
                popupElement.classList.add('hidden');
                if (postHideCallback) {
                    console.log(`Cult Club: Chamando postHideCallback para ${popupElement.id}.`);
                    postHideCallback();
                }
            }, 350); 
        }, autoHideDelay);
    }
}

if(closeErrorPopupBtn) {
    closeErrorPopupBtn.addEventListener('click', () => {
        errorPopup.classList.remove('visible');
        setTimeout(() => errorPopup.classList.add('hidden'), 350);
    });
}

function showEditor(sheetData = null) {
    sheetListView.classList.add('hidden');
    sheetEditorView.classList.remove('hidden');
    if (logoutBtnFooter) logoutBtnFooter.classList.add('hidden'); // Esconde o botão de logout
    sheetEditorView.scrollIntoView({ behavior: 'smooth', block: 'start' });
    characterSheetForm.reset();
    document.getElementById('sheetId').value = '';
    currentEditingSheetId = null;
    if (sheetData) {
        editorTitle.textContent = `Editando Pergaminho: ${sheetData.characterName || 'Ficha Existente'}`;
        populateForm(sheetData);
        currentEditingSheetId = sheetData.id;
        document.getElementById('sheetId').value = sheetData.id;
    } else {
        editorTitle.textContent = 'Novo Pacto (Ficha)';
        populateForm({});
    }
    calculateAllBonuses();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function showList() {
    console.log("Cult Club: showList chamada para exibir lista de fichas.");
    sheetEditorView.classList.add('hidden');
    sheetListView.classList.remove('hidden');
    if (logoutBtnFooter) logoutBtnFooter.classList.remove('hidden'); // Mostra o botão de logout
    currentEditingSheetId = null;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
        
function calculateModifier(score) {
    return Math.floor((parseInt(score || 0) - 10) / 2);
}

function calculateProficiencyBonus(levelString) {
    const levelMatch = levelString ? String(levelString).match(/\d+/) : null;
    const level = levelMatch ? parseInt(levelMatch[0]) : 1;
    if (level >= 17) return 6;
    if (level >= 13) return 5;
    if (level >= 9) return 4;
    if (level >= 5) return 3;
    return 2;
}

function formatBonus(bonus) {
    return bonus >= 0 ? `+${bonus}` : String(bonus);
}

function updateProficiencyBonusDisplay() {
    const classLevel = document.getElementById('classLevel')?.value;
    const bonus = calculateProficiencyBonus(classLevel);
    const profBonusInput = document.getElementById('proficiencyBonus');
    if (profBonusInput) profBonusInput.value = formatBonus(bonus);
}

function updateAbilityScoreAndDependentFields(abilityKey) {
    const scoreInput = document.getElementById(`${abilityKey}Score`);
    const modifierInput = document.getElementById(`${abilityKey}Modifier`);
    if (!scoreInput || !modifierInput) return;
    const score = parseInt(scoreInput.value) || 0;
    const modifier = calculateModifier(score);
    modifierInput.value = formatBonus(modifier);
    updateSavingThrowBonus(abilityKey);
    Object.keys(SKILLS).forEach(skillKey => {
        if (SKILLS[skillKey].ability === abilityKey) {
            updateSkillBonus(skillKey);
        }
    });
    if (abilityKey === 'dexterity') {
        const initiativeInput = document.getElementById('initiative');
        if (initiativeInput) initiativeInput.value = formatBonus(modifier);
    }
}
        
function updateSavingThrowBonus(abilityKey) {
    const scoreVal = document.getElementById(`${abilityKey}Score`)?.value;
    if (scoreVal === undefined) return; 
    const modifier = calculateModifier(scoreVal);
    const proficient = document.getElementById(`savingThrow_${abilityKey}_proficient`)?.checked || false;
    const profBonusString = document.getElementById('proficiencyBonus')?.value || "+0";
    const profBonus = parseInt(profBonusString.replace('+', '')) || 0;
    const totalBonus = modifier + (proficient ? profBonus : 0);
    const bonusDisplay = document.getElementById(`savingThrow_${abilityKey}_bonus`);
    if (bonusDisplay) bonusDisplay.textContent = formatBonus(totalBonus);
}

function updateSkillBonus(skillKey) {
    const skill = SKILLS[skillKey];
    const scoreVal = document.getElementById(`${skill.ability}Score`)?.value;
    if (scoreVal === undefined) return;
    const modifier = calculateModifier(scoreVal);
    const proficient = document.getElementById(`skill_${skillKey}_proficient`)?.checked || false;
    const profBonusString = document.getElementById('proficiencyBonus')?.value || "+0";
    const profBonus = parseInt(profBonusString.replace('+', '')) || 0;
    const totalBonus = modifier + (proficient ? profBonus : 0);
    const bonusDisplay = document.getElementById(`skill_${skillKey}_bonus`);
    if (bonusDisplay) bonusDisplay.textContent = formatBonus(totalBonus);
}

function calculateAllBonuses() {
    updateProficiencyBonusDisplay();
    Object.keys(ABILITIES).forEach(key => {
        updateAbilityScoreAndDependentFields(key);
    });
}

function populateAbilityScores() {
    const grid = document.getElementById('ability-scores-grid');
    grid.innerHTML = '';
    Object.entries(ABILITIES).forEach(([key, name]) => {
        const div = document.createElement('div');
        div.className = 'p-3 rounded-xl shadow-md border ability-score-card'; 
        div.innerHTML = `
            <label for="${key}Score" class="block text-sm font-bold mb-1.5 ability-score-label">${name}</label>
            <div class="flex items-center space-x-2">
                <input type="number" id="${key}Score" name="${key}Score" class="input-field w-1/2 text-center text-lg" value="10">
                <input type="text" id="${key}Modifier" name="${key}Modifier" class="input-field w-1/2 text-center text-lg modifier-display" value="+0" readonly>
            </div>
        `;
        grid.appendChild(div);
        document.getElementById(`${key}Score`).addEventListener('input', () => {
            updateAbilityScoreAndDependentFields(key);
        });
    });
}

function populateSavingThrows() {
    const grid = document.getElementById('saving-throws-grid');
    grid.innerHTML = '';
    Object.entries(ABILITIES).forEach(([key, name]) => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between py-2 proficiency-item'; 
        div.innerHTML = `
            <div class="flex items-center">
                <input type="checkbox" id="savingThrow_${key}_proficient" name="savingThrow_${key}_proficient" class="custom-checkbox mr-3">
                <label for="savingThrow_${key}_proficient" class="text-sm cursor-pointer hover:text-[var(--accent-color)] transition-colors">${name}</label>
            </div>
            <span id="savingThrow_${key}_bonus" class="text-sm font-semibold proficiency-bonus-display">+0</span>
        `;
        grid.appendChild(div);
        document.getElementById(`savingThrow_${key}_proficient`).addEventListener('change', () => updateSavingThrowBonus(key));
    });
}

function populateSkills() {
    const grid = document.getElementById('skills-grid');
    grid.innerHTML = '';
    Object.entries(SKILLS).forEach(([key, skill]) => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between py-2 proficiency-item'; 
        div.innerHTML = `
            <div class="flex items-center">
                <input type="checkbox" id="skill_${key}_proficient" name="skill_${key}_proficient" class="custom-checkbox mr-3">
                <label for="skill_${key}_proficient" class="text-sm cursor-pointer hover:text-[var(--accent-color)] transition-colors">${skill.name} <span class="text-xs text-gray-500">(${ABILITIES[skill.ability].slice(0,3)})</span></label>
            </div>
            <span id="skill_${key}_bonus" class="text-sm font-semibold proficiency-bonus-display">+0</span>
        `;
        grid.appendChild(div);
        document.getElementById(`skill_${key}_proficient`).addEventListener('change', () => updateSkillBonus(key));
    });
}

async function saveSheet(sheetData) {
    console.log("Cult Club: Iniciando saveSheet...", sheetData); 
    if (!userId) {
        console.error("Cult Club: Usuário não autenticado em saveSheet."); 
        showCustomPopup(errorPopup, "Erro Arcano!", "Conexão com os planos superiores perdida (não autenticado). Não foi possível salvar.", 4000);
        return;
    }
    try {
        const sheetsCollectionPath = `artifacts/${appIdForFirestorePath}/users/${userId}/characterSheets`;
        if (currentEditingSheetId) {
            console.log("Cult Club: Atualizando ficha existente:", currentEditingSheetId); 
            const sheetRef = doc(db, sheetsCollectionPath, currentEditingSheetId);
            await setDoc(sheetRef, sheetData, { merge: true });
            console.log("Cult Club: Ficha atualizada com sucesso no Firestore."); 
            showCustomPopup(successPopup, "Pergaminho Atualizado!", "Suas alterações foram seladas nos anais do Culto.", 2800, showList);
        } else {
            console.log("Cult Club: Criando nova ficha no Firestore..."); 
            const docRef = await addDoc(collection(db, sheetsCollectionPath), sheetData);
            currentEditingSheetId = docRef.id; 
            document.getElementById('sheetId').value = docRef.id; 
            console.log("Cult Club: Nova ficha criada com sucesso no Firestore. ID:", docRef.id); 
            showCustomPopup(successPopup, "Novo Pacto Selado!", `Sua nova ficha "${sheetData.characterName || 'Sem Nome'}" foi consagrada ao Culto.`, 2800, showList);
        }
    } catch (e) {
        console.error("Cult Club: Erro CRÍTICO ao salvar ficha no Firestore: ", e); 
        showCustomPopup(errorPopup, "Feitiço de Escrita Falhou!", `Os escribas reportam um erro: ${e.message}. Tente novamente.`, 5000);
    }
}

function loadCharacterSheets() {
    if (!userId) {
        console.log("Cult Club: loadCharacterSheets - userId nulo, não carregando fichas.");
        return;
    }
    console.log(`Cult Club: Carregando fichas para userId: ${userId}, appIdPath: ${appIdForFirestorePath}`);
    if (unsubscribeSheetsListener) {
        console.log("Cult Club: Removendo listener antigo do onSnapshot.");
        unsubscribeSheetsListener(); 
    }
    const sheetsCollectionRef = collection(db, `artifacts/${appIdForFirestorePath}/users/${userId}/characterSheets`);
    unsubscribeSheetsListener = onSnapshot(sheetsCollectionRef, (querySnapshot) => {
        console.log(`Cult Club: onSnapshot recebeu ${querySnapshot.size} documentos.`);
        characterSheetsGrid.innerHTML = '';
        if (querySnapshot.empty) {
            console.log("Cult Club: Nenhuma ficha encontrada no Firestore para este usuário.");
            noSheetsMessage.classList.remove('hidden');
            noSheetsMessage.textContent = "Nenhum grimório encontrado. Conjure um novo!";
        } else {
            noSheetsMessage.classList.add('hidden');
            querySnapshot.forEach((docSnap) => { 
                console.log("Cult Club: Exibindo card para ficha ID:", docSnap.id, docSnap.data());
                displaySheetCard(docSnap.data(), docSnap.id);
            });
        }
        if (typeof lucide !== 'undefined') { lucide.createIcons(); } 
    }, (error) => {
        console.error("Cult Club: Erro no listener onSnapshot ao carregar fichas: ", error);
        noSheetsMessage.textContent = "Erro ao carregar seus grimórios. Verifique o console.";
        noSheetsMessage.classList.remove('hidden');
    });
}

function displaySheetCard(sheetData, sheetId) {
    const card = document.createElement('div');
    card.className = 'card p-5 hover-card-effect transition-all duration-300 cursor-pointer slide-in-left flex flex-col'; 
    card.innerHTML = `
        <div class="flex-grow"> 
            <h4 class="font-medieval text-2xl mb-2 truncate sheet-card-title">${sheetData.characterName || 'Ficha Sem Nome'}</h4>
            <p class="text-sm text-gray-400 mb-1 truncate">Classe: ${sheetData.classLevel || 'N/A'}</p>
            <p class="text-sm text-gray-400 mb-4 truncate">Raça: ${sheetData.race || 'N/A'}</p>
        </div>
        <div class="flex justify-end space-x-2 mt-auto pt-3 border-t border-[var(--input-border)]"> 
            <button data-id="${sheetId}" class="edit-sheet-btn btn-base btn-card-action"> 
                <i data-lucide="file-pen-line" class="inline-block mr-1 h-4 w-4"></i>Editar
            </button>
            <button data-id="${sheetId}" class="delete-sheet-btn btn-base btn-card-action-danger"> 
                 <i data-lucide="trash-2" class="inline-block mr-1 h-4 w-4"></i>Excluir
            </button>
        </div>
    `;
    card.addEventListener('click', (e) => {
        const targetButton = e.target.closest('button');
        if (targetButton?.classList.contains('edit-sheet-btn')) {
            const id = targetButton.dataset.id;
            showEditor({ ...sheetData, id });
        } else if (targetButton?.classList.contains('delete-sheet-btn')) {
            sheetIdToDelete = targetButton.dataset.id;
            deleteConfirmModal.classList.remove('hidden');
            deleteConfirmModal.querySelector('.card').classList.add('modal-animation');
        } else { 
             const id = card.querySelector('.edit-sheet-btn').dataset.id;
             showEditor({ ...sheetData, id });
        }
    });
    characterSheetsGrid.appendChild(card);
}
        
async function deleteSheetHandler(sheetId) {
    if (!userId || !sheetId) return;
    try {
        const sheetRef = doc(db, `artifacts/${appIdForFirestorePath}/users/${userId}/characterSheets`, sheetId);
        await deleteDoc(sheetRef);
        showCustomPopup(successPopup, "Ficha Exilada!", "O conhecimento arcano foi banido com sucesso dos registros.", 2000);
    } catch (e) {
        console.error("Erro ao excluir ficha: ", e);
        showCustomPopup(errorPopup, "Ritual Falhou!", `Erro ao excluir ficha: ${e.message}.`, 3000);
    }
}
        
function getFormData() {
    const formData = new FormData(characterSheetForm);
    const sheetData = {};
    for (let [key, value] of formData.entries()) {
        if (key.includes('_proficient')) {
            const baseKey = key.replace('_proficient', '');
            const [type, actualKey] = baseKey.split('_');
             if (!sheetData[type]) sheetData[type] = {};
             if (!sheetData[type][actualKey]) sheetData[type][actualKey] = {};
            sheetData[type][actualKey].proficient = characterSheetForm.elements[key].checked;
        } else if (key.includes('Score') || key.includes('Modifier')) {
            const abilityKey = key.replace('Score', '').replace('Modifier', '');
            if (!sheetData.abilityScores) sheetData.abilityScores = {};
            if (!sheetData.abilityScores[abilityKey]) sheetData.abilityScores[abilityKey] = {};
            if (key.includes('Score')) sheetData.abilityScores[abilityKey].score = parseInt(value) || 0;
            else sheetData.abilityScores[abilityKey].modifier = value;
        } else if (characterSheetForm.elements[key]?.type === 'checkbox' && !key.startsWith('deathSave')) {
             sheetData[key] = characterSheetForm.elements[key].checked;
        }
         else {
            sheetData[key] = value;
        }
    }
    
    ['savingThrow', 'skill'].forEach(type => {
        const prefix = type === 'savingThrow' ? 'savingThrow_' : 'skill_';
        const sourceObject = type === 'savingThrow' ? ABILITIES : SKILLS;
        Object.keys(sourceObject).forEach(itemKey => {
            if (!sheetData[type]?.[itemKey]?.proficient) { 
                if (!sheetData[type]) sheetData[type] = {};
                if (!sheetData[type][itemKey]) sheetData[type][itemKey] = {};
                sheetData[type][itemKey].proficient = false;
            }
            const bonusEl = document.getElementById(`${prefix}${itemKey}_bonus`);
            if (bonusEl) sheetData[type][itemKey].bonus = bonusEl.textContent;
        });
    });

    sheetData.deathSaves = {
        successes: ['deathSaveSuccess1', 'deathSaveSuccess2', 'deathSaveSuccess3'].filter(id => document.getElementById(id).checked).length,
        failures: ['deathSaveFailure1', 'deathSaveFailure2', 'deathSaveFailure3'].filter(id => document.getElementById(id).checked).length
    };
    
    ['experiencePoints', 'inspiration', 'armorClass', 'hpMax', 'hpCurrent', 'hpTemp'].forEach(field => {
        if (sheetData[field] !== undefined && sheetData[field] !== '') sheetData[field] = parseInt(sheetData[field]);
        else if (sheetData[field] === '') sheetData[field] = 0; 
    });
    return sheetData;
}

function populateForm(sheetData) {
    characterSheetForm.reset();
    document.getElementById('sheetId').value = sheetData.id || '';
    Object.keys(sheetData).forEach(key => {
        const field = characterSheetForm.elements[key];
        if (field) {
             if (field.nodeName === 'TEXTAREA' || field.type === 'text' || field.type === 'number' || field.type === 'email' || field.type === 'password') {
                 field.value = sheetData[key] === undefined ? '' : sheetData[key];
            }
        }
    });
    if (sheetData.abilityScores) {
        Object.entries(sheetData.abilityScores).forEach(([abilityKey, data]) => {
            const scoreEl = document.getElementById(`${abilityKey}Score`);
            if (scoreEl) scoreEl.value = data.score === undefined ? 10 : data.score;
        });
    } else {
         Object.keys(ABILITIES).forEach(abilityKey => {
            const scoreEl = document.getElementById(`${abilityKey}Score`);
            if (scoreEl) scoreEl.value = 10;
        });
    }
    if (sheetData.savingThrow) {
        Object.entries(sheetData.savingThrow).forEach(([abilityKey, data]) => {
            const checkbox = document.getElementById(`savingThrow_${abilityKey}_proficient`);
            if (checkbox) checkbox.checked = data.proficient || false;
        });
    }
    if (sheetData.skill) {
        Object.entries(sheetData.skill).forEach(([skillKey, data]) => {
            const checkbox = document.getElementById(`skill_${skillKey}_proficient`);
            if (checkbox) checkbox.checked = data.proficient || false;
        });
    }
    if (sheetData.deathSaves) {
        for(let i=1; i<=3; i++) {
            document.getElementById(`deathSaveSuccess${i}`).checked = i <= (sheetData.deathSaves.successes || 0);
            document.getElementById(`deathSaveFailure${i}`).checked = i <= (sheetData.deathSaves.failures || 0);
        }
    }
    calculateAllBonuses();
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        userId = user.uid;
        console.log("Cult Club: Usuário autenticado. UID:", userId, "Email:", user.email, "DisplayName:", user.displayName); 
        const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Iniciado');
        authStatusEl.textContent = `Bem-vindo, ó ${displayName} do Culto!`;
        showAppView(); 
        loginErrorEl.classList.add('hidden');
        registerErrorEl.classList.add('hidden');
    } else {
        userId = null;
        console.log("Cult Club: Nenhum usuário autenticado.");
        showAuthView(); 
        authStatusEl.textContent = "";
    }
    if (typeof lucide !== 'undefined') { 
         lucide.createIcons(); 
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    loginErrorEl.textContent = ''; loginErrorEl.classList.add('hidden');
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showCustomPopup(successPopup, "Portal Reaberto!", "Você adentrou novamente os mistérios do Cult Club!", 2500);
    } catch (error) {
        console.error("Erro de login:", error);
        loginErrorEl.textContent = "Feitiço de login falhou: " + error.message.replace('Firebase: Error ', '').replace(/\(auth\/.*\)\.?/, '').trim();
        loginErrorEl.classList.remove('hidden');
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value.trim(); 
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    registerErrorEl.textContent = ''; registerErrorEl.classList.add('hidden');

    if (!username) { 
        registerErrorEl.textContent = "Por favor, insira um nome de usuário para o seu pacto.";
        registerErrorEl.classList.remove('hidden');
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        if (user) { 
            await updateProfile(user, { displayName: username });
            console.log("Cult Club: Perfil atualizado com displayName:", username);
            showCustomPopup(successPopup, "Iniciação Concluída!", `Seu pacto com o Cult Club como "${username}" foi selado!`, 2500);
        } else {
            throw new Error("Usuário não criado corretamente.");
        }
    } catch (error) {
        console.error("Erro de registro:", error);
        registerErrorEl.textContent = "Pacto de iniciação falhou: " + error.message.replace('Firebase: Error ', '').replace(/\(auth\/.*\)\.?/, '').trim();
        registerErrorEl.classList.remove('hidden');
    }
});
        
logoutBtnFooter.addEventListener('click', async () => { 
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Erro ao sair:", error);
        showCustomPopup(errorPopup, "Ritual Interrompido", "Erro ao tentar quebrar o pacto (sair).", 3000);
    }
});

createNewSheetBtn.addEventListener('click', () => showEditor());
closeEditorBtn.addEventListener('click', showList);
characterSheetForm.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log("Cult Club: Formulário de ficha submetido."); 
    const sheetData = getFormData();
    saveSheet(sheetData);
});
        
document.getElementById('cancel-edit-btn').addEventListener('click', showList);
document.getElementById('classLevel').addEventListener('input', calculateAllBonuses);

cancelDeleteBtn.addEventListener('click', () => {
    deleteConfirmModal.classList.add('hidden');
    deleteConfirmModal.querySelector('.card').classList.remove('modal-animation');
    sheetIdToDelete = null;
});
confirmDeleteBtn.addEventListener('click', () => {
    if (sheetIdToDelete) {
        deleteSheetHandler(sheetIdToDelete);
    }
    deleteConfirmModal.classList.add('hidden');
    deleteConfirmModal.querySelector('.card').classList.remove('modal-animation');
    sheetIdToDelete = null;
});

function initApp() {
    populateAbilityScores();
    populateSavingThrows();
    populateSkills();
    updateFooterText(); 
    if (typeof lucide !== 'undefined') { 
        lucide.createIcons(); 
    }
    console.log("Cult Club: initApp concluída.");
}
document.addEventListener('DOMContentLoaded', initApp);