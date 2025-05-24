import { getFirestore, collection, addDoc, doc, setDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { ABILITIES, SKILLS } from './constants.js';
import { showCustomPopup, showSheetListViewUI, showSheetEditorUI } from './ui.js';
import { successPopup, errorPopup } from './ui.js';

let dbInstance;
let currentAppIdPath;
let currentUserIdForSheets; 
let currentEditingSheetId = null;
let sheetIdToDelete = null;
let unsubscribeSheetsListener = null;

const characterSheetForm = document.getElementById('character-sheet-form');
const characterSheetsGrid = document.getElementById('character-sheets-grid');
const noSheetsMessage = document.getElementById('no-sheets-message');
const editorTitle = document.getElementById('editor-title');
const deleteConfirmModal = document.getElementById('delete-confirm-modal');


export function initSheetLogic(firestoreInstance, appIdPath) {
    dbInstance = firestoreInstance;
    currentAppIdPath = appIdPath;
}

export function updateUserIdForSheets(newUserId) {
    currentUserIdForSheets = newUserId;
    if (unsubscribeSheetsListener) { 
        unsubscribeSheetsListener();
        unsubscribeSheetsListener = null;
    }
    if (currentUserIdForSheets) {
        loadCharacterSheets(); 
    } else {
        if (characterSheetsGrid) characterSheetsGrid.innerHTML = ''; 
        if (noSheetsMessage) {
            noSheetsMessage.classList.remove('hidden');
            noSheetsMessage.textContent = "Autentique-se para ver seus grimórios.";
        }
    }
}


function calculateModifier(score) { return Math.floor((parseInt(score || 0) - 10) / 2); }
function calculateProficiencyBonus(levelString) {
    const levelMatch = levelString ? String(levelString).match(/\d+/) : null;
    const level = levelMatch ? parseInt(levelMatch[0]) : 1;
    if (level >= 17) return 6; if (level >= 13) return 5; if (level >= 9) return 4; if (level >= 5) return 3; return 2;
}
function formatBonus(bonus) { return bonus >= 0 ? `+${bonus}` : String(bonus); }

function updateProficiencyBonusDisplay() {
    const classLevelEl = document.getElementById('classLevel');
    if (!classLevelEl) return;
    const classLevel = classLevelEl.value;
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
    Object.keys(SKILLS).forEach(skillKey => { if (SKILLS[skillKey].ability === abilityKey) updateSkillBonus(skillKey); });
    if (abilityKey === 'dexterity') {
        const initiativeInput = document.getElementById('initiative');
        if (initiativeInput) initiativeInput.value = formatBonus(modifier);
    }
}

function updateSavingThrowBonus(abilityKey) {
    const scoreInput = document.getElementById(`${abilityKey}Score`);
    if (!scoreInput) return;
    const scoreVal = scoreInput.value;
    const modifier = calculateModifier(scoreVal);
    const proficientCheckbox = document.getElementById(`savingThrow_${abilityKey}_proficient`);
    const proficient = proficientCheckbox ? proficientCheckbox.checked : false;
    const profBonusInput = document.getElementById('proficiencyBonus');
    const profBonusString = profBonusInput ? profBonusInput.value : "+0";
    const profBonus = parseInt(profBonusString.replace('+', '')) || 0;
    const totalBonus = modifier + (proficient ? profBonus : 0);
    const bonusDisplay = document.getElementById(`savingThrow_${abilityKey}_bonus`);
    if (bonusDisplay) bonusDisplay.textContent = formatBonus(totalBonus);
}

function updateSkillBonus(skillKey) {
    const skill = SKILLS[skillKey];
    const scoreInput = document.getElementById(`${skill.ability}Score`);
    if (!scoreInput) return;
    const scoreVal = scoreInput.value;
    const modifier = calculateModifier(scoreVal);
    const proficientCheckbox = document.getElementById(`skill_${skillKey}_proficient`);
    const proficient = proficientCheckbox ? proficientCheckbox.checked : false;
    const profBonusInput = document.getElementById('proficiencyBonus');
    const profBonusString = profBonusInput ? profBonusInput.value : "+0";
    const profBonus = parseInt(profBonusString.replace('+', '')) || 0;
    const totalBonus = modifier + (proficient ? profBonus : 0);
    const bonusDisplay = document.getElementById(`skill_${skillKey}_bonus`);
    if (bonusDisplay) bonusDisplay.textContent = formatBonus(totalBonus);
}

export function calculateAllSheetBonuses() {
    updateProficiencyBonusDisplay();
    Object.keys(ABILITIES).forEach(key => updateAbilityScoreAndDependentFields(key));
}

export function populateAbilityScores() {
    const grid = document.getElementById('ability-scores-grid'); if (!grid) return; grid.innerHTML = '';
    Object.entries(ABILITIES).forEach(([key, name]) => {
        const div = document.createElement('div');
        div.className = 'p-3 rounded-xl shadow-md border ability-score-card';
        div.innerHTML = `<label for="${key}Score" class="block text-sm font-bold mb-1.5 ability-score-label">${name}</label><div class="flex items-center space-x-2"><input type="number" id="${key}Score" name="${key}Score" class="input-field w-1/2 text-center text-lg" value="10"><input type="text" id="${key}Modifier" name="${key}Modifier" class="input-field w-1/2 text-center text-lg modifier-display" value="+0" readonly></div>`;
        grid.appendChild(div);
        const scoreInput = document.getElementById(`${key}Score`);
        if (scoreInput) scoreInput.addEventListener('input', () => updateAbilityScoreAndDependentFields(key));
    });
}
export function populateSavingThrows() {
    const grid = document.getElementById('saving-throws-grid'); if (!grid) return; grid.innerHTML = '';
    Object.entries(ABILITIES).forEach(([key, name]) => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between py-2 proficiency-item';
        div.innerHTML = `<div class="flex items-center"><input type="checkbox" id="savingThrow_${key}_proficient" name="savingThrow_${key}_proficient" class="custom-checkbox mr-3"><label for="savingThrow_${key}_proficient" class="text-sm cursor-pointer hover:text-[var(--accent-color)] transition-colors">${name}</label></div><span id="savingThrow_${key}_bonus" class="text-sm font-semibold proficiency-bonus-display">+0</span>`;
        grid.appendChild(div);
        const checkbox = document.getElementById(`savingThrow_${key}_proficient`);
        if (checkbox) checkbox.addEventListener('change', () => updateSavingThrowBonus(key));
    });
}
export function populateSkills() {
    const grid = document.getElementById('skills-grid'); if (!grid) return; grid.innerHTML = '';
    Object.entries(SKILLS).forEach(([key, skill]) => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between py-2 proficiency-item';
        div.innerHTML = `<div class="flex items-center"><input type="checkbox" id="skill_${key}_proficient" name="skill_${key}_proficient" class="custom-checkbox mr-3"><label for="skill_${key}_proficient" class="text-sm cursor-pointer hover:text-[var(--accent-color)] transition-colors">${skill.name} <span class="text-xs text-gray-500">(${ABILITIES[skill.ability].slice(0, 3)})</span></label></div><span id="skill_${key}_bonus" class="text-sm font-semibold proficiency-bonus-display">+0</span>`;
        grid.appendChild(div);
        const checkbox = document.getElementById(`skill_${key}_proficient`);
        if (checkbox) checkbox.addEventListener('change', () => updateSkillBonus(key));
    });
}

function getSheetFormData() {
    if (!characterSheetForm) return {};
    const formData = new FormData(characterSheetForm); const sheetData = {};
    for (let [key, value] of formData.entries()) {
        const element = characterSheetForm.elements[key];
        if (key.includes('_proficient')) {
            const [type, actualKey] = key.replace('_proficient', '').split('_');
            if (!sheetData[type]) sheetData[type] = {}; if (!sheetData[type][actualKey]) sheetData[type][actualKey] = {};
            if (element) sheetData[type][actualKey].proficient = element.checked;
        } else if (key.includes('Score') || key.includes('Modifier')) {
            const abilityKey = key.replace('Score', '').replace('Modifier', '');
            if (!sheetData.abilityScores) sheetData.abilityScores = {}; if (!sheetData.abilityScores[abilityKey]) sheetData.abilityScores[abilityKey] = {};
            if (key.includes('Score')) sheetData.abilityScores[abilityKey].score = parseInt(value) || 0;
            else sheetData.abilityScores[abilityKey].modifier = value;
        } else if (element?.type === 'checkbox' && !key.startsWith('deathSave')) { if (element) sheetData[key] = element.checked; }
        else sheetData[key] = value;
    }
    ['savingThrow', 'skill'].forEach(type => {
        const prefix = type === 'savingThrow' ? 'savingThrow_' : 'skill_';
        const sourceObject = type === 'savingThrow' ? ABILITIES : SKILLS;
        Object.keys(sourceObject).forEach(itemKey => {
            if (!sheetData[type]?.[itemKey]?.proficient) { if (!sheetData[type]) sheetData[type] = {}; if (!sheetData[type][itemKey]) sheetData[type][itemKey] = {}; sheetData[type][itemKey].proficient = false; }
            const bonusEl = document.getElementById(`${prefix}${itemKey}_bonus`);
            if (bonusEl) { if (!sheetData[type][itemKey]) sheetData[type][itemKey] = {}; sheetData[type][itemKey].bonus = bonusEl.textContent; }
        });
    });
    sheetData.deathSaves = { successes: ['deathSaveSuccess1','deathSaveSuccess2','deathSaveSuccess3'].filter(id=>document.getElementById(id)?.checked).length, failures: ['deathSaveFailure1','deathSaveFailure2','deathSaveFailure3'].filter(id=>document.getElementById(id)?.checked).length };
    ['experiencePoints','inspiration','armorClass','hpMax','hpCurrent','hpTemp'].forEach(f => { if(sheetData[f]!==undefined && sheetData[f]!=='') sheetData[f]=parseInt(sheetData[f]); else if(sheetData[f]==='') sheetData[f]=0; });
    return sheetData;
}

function populateSheetForm(sheetData) {
    if (!characterSheetForm) return;
    characterSheetForm.reset();
    const sheetIdInput = document.getElementById('sheetId');
    if (sheetIdInput) sheetIdInput.value = sheetData.id || '';

    Object.keys(sheetData).forEach(key => {
        const field = characterSheetForm.elements[key];
        if (field) {
            if (Array.isArray(field)) {
                field.forEach(f => { if (f.value === String(sheetData[key])) f.checked = true; });
            } else if (field.type === 'checkbox' && !key.startsWith('deathSave') && !key.includes('_proficient')) {
                field.checked = sheetData[key] || false;
            } else if (field.nodeName === 'TEXTAREA' || field.type === 'text' || field.type === 'number' || field.type === 'email' || field.type === 'password') {
                field.value = sheetData[key] === undefined || sheetData[key] === null ? '' : sheetData[key];
            }
        }
    });
    if (sheetData.abilityScores) { Object.entries(sheetData.abilityScores).forEach(([ak, d]) => { const se = document.getElementById(`${ak}Score`); if (se) se.value = d.score === undefined ? 10 : d.score; }); } else { Object.keys(ABILITIES).forEach(ak => { const se = document.getElementById(`${ak}Score`); if (se) se.value = 10; }); }
    if (sheetData.savingThrow) { Object.entries(sheetData.savingThrow).forEach(([ak, d]) => { const cb = document.getElementById(`savingThrow_${ak}_proficient`); if (cb) cb.checked = d.proficient || false; }); } else { Object.keys(ABILITIES).forEach(ak => { const cb = document.getElementById(`savingThrow_${ak}_proficient`); if (cb) cb.checked = false; }); }
    if (sheetData.skill) { Object.entries(sheetData.skill).forEach(([sk, d]) => { const cb = document.getElementById(`skill_${sk}_proficient`); if (cb) cb.checked = d.proficient || false; }); } else { Object.keys(SKILLS).forEach(sk => { const cb = document.getElementById(`skill_${sk}_proficient`); if (cb) cb.checked = false; }); }
    if (sheetData.deathSaves) { for (let i = 1; i <= 3; i++) { const scb = document.getElementById(`deathSaveSuccess${i}`); if (scb) scb.checked = i <= (sheetData.deathSaves.successes || 0); const fcb = document.getElementById(`deathSaveFailure${i}`); if (fcb) fcb.checked = i <= (sheetData.deathSaves.failures || 0); } } else { for (let i = 1; i <= 3; i++) { const scb = document.getElementById(`deathSaveSuccess${i}`); if (scb) scb.checked = false; const fcb = document.getElementById(`deathSaveFailure${i}`); if (fcb) fcb.checked = false; } }
    calculateAllSheetBonuses();
}

export function openSheetEditor(sheetData = null) {
    showSheetEditorUI();
    if (characterSheetForm) characterSheetForm.reset();
    const sheetIdInput = document.getElementById('sheetId');

    currentEditingSheetId = null; 
    if (sheetIdInput) sheetIdInput.value = '';


    if (sheetData) {
        if (editorTitle) editorTitle.textContent = `Editando Pergaminho: ${sheetData.characterName || 'Ficha Existente'}`;
        populateSheetForm(sheetData); 
        currentEditingSheetId = sheetData.id;
        if (sheetIdInput) sheetIdInput.value = sheetData.id;
    } else {
        if (editorTitle) editorTitle.textContent = 'Novo Pacto (Ficha)';
        populateSheetForm({}); 
    }
    calculateAllSheetBonuses();
}

async function saveSheet() {
    if (!currentUserIdForSheets) { showCustomPopup(errorPopup, "Erro Arcano!", "Não autenticado.", 4000); return; }
    const sheetData = getSheetFormData();
    try {
        const sheetsCollectionPath = `artifacts/${currentAppIdPath}/users/${currentUserIdForSheets}/characterSheets`;
        const sheetIdInput = document.getElementById('sheetId');

        if (currentEditingSheetId) {
            await setDoc(doc(dbInstance, sheetsCollectionPath, currentEditingSheetId), sheetData, { merge: true });
            showCustomPopup(successPopup, "Pergaminho Atualizado!", "Alterações seladas.", 2800, showSheetListViewUI);
        } else {
            const docRef = await addDoc(collection(dbInstance, sheetsCollectionPath), sheetData);
            currentEditingSheetId = docRef.id; 
            if (sheetIdInput) sheetIdInput.value = docRef.id; 
            showCustomPopup(successPopup, "Novo Pacto Selado!", `Ficha "${sheetData.characterName || 'Sem Nome'}" consagrada.`, 2800, showSheetListViewUI);
        }
    } catch (e) { showCustomPopup(errorPopup, "Feitiço Falhou!", `Erro ao salvar: ${e.message}.`, 5000); }
}

function displaySheetCard(sheetData, sheetId) {
    if (!characterSheetsGrid) return;
    const card = document.createElement('div');
    card.className = 'card p-5 hover-card-effect transition-all duration-300 cursor-pointer slide-in-left flex flex-col';
    card.innerHTML = `<div class="flex-grow"><h4 class="font-medieval text-2xl mb-2 truncate sheet-card-title">${sheetData.characterName||'Ficha Sem Nome'}</h4><p class="text-sm text-gray-400 mb-1 truncate">Classe: ${sheetData.classLevel||'N/A'}</p><p class="text-sm text-gray-400 mb-4 truncate">Raça: ${sheetData.race||'N/A'}</p></div><div class="flex justify-end space-x-2 mt-auto pt-3 border-t border-[var(--input-border)]"><button data-id="${sheetId}" class="edit-sheet-btn btn-base btn-card-action"><i data-lucide="file-pen-line" class="inline-block mr-1 h-4 w-4"></i>Editar</button><button data-id="${sheetId}" class="delete-sheet-btn btn-base btn-card-action-danger"><i data-lucide="trash-2" class="inline-block mr-1 h-4 w-4"></i>Excluir</button></div>`;
    
    card.addEventListener('click', (e) => {
        const targetButton = e.target.closest('button');
        if (targetButton?.classList.contains('edit-sheet-btn')) {
            openSheetEditor({ ...sheetData, id: sheetId });
        } else if (targetButton?.classList.contains('delete-sheet-btn')) {
            sheetIdToDelete = sheetId;
            if (deleteConfirmModal) { 
                deleteConfirmModal.classList.remove('hidden'); 
                const mc = deleteConfirmModal.querySelector('.card'); 
                if (mc) mc.classList.add('modal-animation'); 
            }
        } else { 
            openSheetEditor({ ...sheetData, id: sheetId });
        }
    });
    characterSheetsGrid.appendChild(card);
}

async function deleteSheet() {
    if (!currentUserIdForSheets || !sheetIdToDelete) return;
    try {
        await deleteDoc(doc(dbInstance, `artifacts/${currentAppIdPath}/users/${currentUserIdForSheets}/characterSheets`, sheetIdToDelete));
        showCustomPopup(successPopup, "Ficha Exilada!", "Conhecimento banido.", 2000);
    } catch (e) { showCustomPopup(errorPopup, "Ritual Falhou!", `Erro ao excluir: ${e.message}.`, 3000); }
    finally {
        if (deleteConfirmModal) { 
            deleteConfirmModal.classList.add('hidden'); 
            const mc = deleteConfirmModal.querySelector('.card'); 
            if (mc) mc.classList.remove('modal-animation'); 
        }
        sheetIdToDelete = null;
    }
}

export function loadCharacterSheets() {
    if (!currentUserIdForSheets) {
        if(characterSheetsGrid) characterSheetsGrid.innerHTML = '';
        if(noSheetsMessage) { noSheetsMessage.classList.remove('hidden'); noSheetsMessage.textContent = "Autentique-se para ver seus grimórios."; }
        return;
    }
    if (unsubscribeSheetsListener) unsubscribeSheetsListener();
    const sheetsCollectionRef = collection(dbInstance, `artifacts/${currentAppIdPath}/users/${currentUserIdForSheets}/characterSheets`);
    unsubscribeSheetsListener = onSnapshot(sheetsCollectionRef, (querySnapshot) => {
        if(characterSheetsGrid) characterSheetsGrid.innerHTML = '';
        if (querySnapshot.empty) {
            if(noSheetsMessage) { noSheetsMessage.classList.remove('hidden'); noSheetsMessage.textContent = "Nenhum grimório encontrado. Conjure um novo!"; }
        } else {
            if(noSheetsMessage) noSheetsMessage.classList.add('hidden');
            querySnapshot.forEach((docSnap) => displaySheetCard(docSnap.data(), docSnap.id));
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }, (error) => {
        console.error("Erro ao carregar fichas:", error)
        if(noSheetsMessage) { noSheetsMessage.textContent = "Erro ao carregar grimórios."; noSheetsMessage.classList.remove('hidden');}
    });
}

export function setupSheetEventListeners(closeEditorBtn, createNewSheetBtn, cancelEditBtn, classLevelInput, cancelDeleteSheetBtn, confirmDeleteSheetBtn) {
    if (characterSheetForm) characterSheetForm.addEventListener('submit', (e) => { e.preventDefault(); saveSheet(); });
    if (closeEditorBtn) closeEditorBtn.addEventListener('click', showSheetListViewUI);
    if (createNewSheetBtn) createNewSheetBtn.addEventListener('click', () => openSheetEditor());
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', showSheetListViewUI);
    if (classLevelInput) classLevelInput.addEventListener('input', calculateAllSheetBonuses);
    if (cancelDeleteSheetBtn && deleteConfirmModal) {
        cancelDeleteSheetBtn.addEventListener('click', () => {
            deleteConfirmModal.classList.add('hidden');
            const mc = deleteConfirmModal.querySelector('.card'); if (mc) mc.classList.remove('modal-animation');
            sheetIdToDelete = null;
        });
    }
    if (confirmDeleteSheetBtn) confirmDeleteSheetBtn.addEventListener('click', deleteSheet);
}