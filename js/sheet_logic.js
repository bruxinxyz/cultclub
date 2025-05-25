// Cult Club/js/sheet_logic.js
import { getFirestore, collection, addDoc, doc, setDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { ABILITIES, SKILLS, RACES, CLASSES, ARMOR_TYPES, SHIELD_BONUS, SPELLCASTING_ABILITIES_OPTIONS } from './constants.js';
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

const raceSelect = document.getElementById('race');
const classLevelInput = document.getElementById('classLevel');
const armorTypeSelect = document.getElementById('armorType');
const shieldEquippedCheckbox = document.getElementById('shieldEquipped');
const spellcastingAbilitySelect = document.getElementById('spellcastingAbility');
const proficienciesLanguagesText = document.getElementById('proficienciesLanguagesText');
const racialBonusDisplayArea = document.getElementById('racial-bonus-display-area');


function populateRaceOptions() {
    if (!raceSelect) return;
    raceSelect.innerHTML = '<option value="">-- Selecione a Raça --</option>';
    for (const raceKey in RACES) {
        const option = document.createElement('option');
        option.value = raceKey;
        option.textContent = RACES[raceKey].name;
        raceSelect.appendChild(option);
    }
}

function populateArmorOptions() {
    if (!armorTypeSelect) return;
    armorTypeSelect.innerHTML = '';
    for (const armorKey in ARMOR_TYPES) {
        const option = document.createElement('option');
        option.value = armorKey;
        option.textContent = ARMOR_TYPES[armorKey].name;
        armorTypeSelect.appendChild(option);
    }
}

function populateSpellcastingAbilityOptions() {
    if (!spellcastingAbilitySelect) return;
    spellcastingAbilitySelect.innerHTML = '';
    for (const abilityKey in SPELLCASTING_ABILITIES_OPTIONS) {
        const option = document.createElement('option');
        option.value = abilityKey;
        option.textContent = SPELLCASTING_ABILITIES_OPTIONS[abilityKey];
        spellcastingAbilitySelect.appendChild(option);
    }
}

export function initSheetLogic(firestoreInstance, appIdPath) {
    dbInstance = firestoreInstance;
    currentAppIdPath = appIdPath;
    populateRaceOptions();
    populateArmorOptions();
    populateSpellcastingAbilityOptions();
}

export function updateUserIdForSheets(newUserId) {
    // console.log("[SheetLogic DIAGNÓSTICO] updateUserIdForSheets chamado com userId:", newUserId);
    currentUserIdForSheets = newUserId;
    if (unsubscribeSheetsListener) {
        // console.log("[SheetLogic DIAGNÓSTICO] Desinscrevendo do listener de fichas anterior.");
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

function getModifier(score) { return Math.floor((parseInt(score || 0) - 10) / 2); }

function getProficiencyBonus(totalLevel) {
    if (totalLevel >= 17) return 6;
    if (totalLevel >= 13) return 5;
    if (totalLevel >= 9) return 4;
    if (totalLevel >= 5) return 3;
    return 2;
}
function formatBonus(bonus) { return bonus >= 0 ? `+${bonus}` : String(bonus); }

function parseClassAndLevel(classLevelString) {
    const entries = classLevelString.toLowerCase().split('/').map(s => s.trim());
    let totalLevel = 0;
    const classesInfo = [];
    if (!classLevelString.trim()) return { totalLevel: 1, classesInfo: [] };
    entries.forEach(entry => {
        let bestMatch = null; let longestMatchLength = 0;
        for (const classKey in CLASSES) {
            const classNameNormalized = CLASSES[classKey].name.toLowerCase();
            if (entry.startsWith(classNameNormalized)) {
                if (classNameNormalized.length > longestMatchLength) {
                    const levelPart = entry.substring(classNameNormalized.length).trim();
                    const levelMatch = levelPart.match(/^(\d+)/);
                    if (levelMatch && parseInt(levelMatch[0]) > 0) {
                        bestMatch = { classKey, className: CLASSES[classKey].name, level: parseInt(levelMatch[0]) };
                        longestMatchLength = classNameNormalized.length;
                    } else if (!levelPart && entry === classNameNormalized) {
                         bestMatch = { classKey, className: CLASSES[classKey].name, level: 1 };
                         longestMatchLength = classNameNormalized.length;
                    }
                }
            }
        }
        if (bestMatch) { totalLevel += bestMatch.level; classesInfo.push(bestMatch); }
    });
    return { totalLevel: Math.max(1, totalLevel), classesInfo };
}

function updateProficiencyBonusDisplay() {
    const classLevelStr = classLevelInput ? classLevelInput.value : "";
    const { totalLevel } = parseClassAndLevel(classLevelStr);
    const bonus = getProficiencyBonus(totalLevel);
    // console.log(`[SheetLogic DIAGNÓSTICO] Classe & Nível Input: "${classLevelStr}" -> Nível Total: ${totalLevel}, Bônus Prof: ${bonus}`);
    const profBonusInput = document.getElementById('proficiencyBonus');
    if (profBonusInput) profBonusInput.value = formatBonus(bonus);
    return bonus;
}

function getRacialBonusForAbility(raceKey, abilityKey) {
    if (raceKey === "humano") return 1;
    if (raceKey && RACES[raceKey] && RACES[raceKey].abilityScoreIncrease && RACES[raceKey].abilityScoreIncrease[abilityKey] !== undefined) {
        return RACES[raceKey].abilityScoreIncrease[abilityKey];
    }
    return 0;
}

function updateAbilityModifiersAndDependentCalculations() {
    const profBonus = updateProficiencyBonusDisplay();
    const selectedRaceKey = raceSelect ? raceSelect.value : null;
    Object.keys(ABILITIES).forEach(abilityKey => {
        const baseScoreEl = document.getElementById(`${abilityKey}Score`);
        const modifierEl = document.getElementById(`${abilityKey}Modifier`);
        if (baseScoreEl && modifierEl) {
            const baseScore = parseInt(baseScoreEl.value) || 10;
            const racialBonus = getRacialBonusForAbility(selectedRaceKey, abilityKey);
            const totalScore = baseScore + racialBonus;
            const modifier = getModifier(totalScore);
            modifierEl.value = formatBonus(modifier);
        }
        updateSavingThrowBonus(abilityKey, profBonus);
        Object.keys(SKILLS).forEach(skillKey => {
            if (SKILLS[skillKey].ability === abilityKey) {
                updateSkillBonus(skillKey, profBonus);
            }
        });
    });
    updateInitiative(); updateArmorClass(); updateSpellcastingCalculations(); updateLevel1MaxHP();
}

function updateSavingThrowBonus(abilityKey, profBonus) {
    const baseScoreEl = document.getElementById(`${abilityKey}Score`);
    const selectedRaceKey = raceSelect ? raceSelect.value : null;
    if (!baseScoreEl) return;
    const baseScore = parseInt(baseScoreEl.value) || 10;
    const racialBonus = getRacialBonusForAbility(selectedRaceKey, abilityKey);
    const totalScore = baseScore + racialBonus;
    const modifier = getModifier(totalScore);
    const proficientCheckbox = document.getElementById(`savingThrow_${abilityKey}_proficient`);
    const proficient = proficientCheckbox ? proficientCheckbox.checked : false;
    const totalBonusValue = modifier + (proficient ? profBonus : 0);
    const bonusDisplay = document.getElementById(`savingThrow_${abilityKey}_bonus`);
    if (bonusDisplay) bonusDisplay.textContent = formatBonus(totalBonusValue);
}

function updateSkillBonus(skillKey, profBonus) {
    const skillData = SKILLS[skillKey];
    const baseScoreEl = document.getElementById(`${skillData.ability}Score`);
    const selectedRaceKey = raceSelect ? raceSelect.value : null;
    if (!baseScoreEl) return;

    const baseScore = parseInt(baseScoreEl.value) || 10;
    const racialBonus = getRacialBonusForAbility(selectedRaceKey, skillData.ability);
    const totalScore = baseScore + racialBonus;
    const modifier = getModifier(totalScore);

    const proficientCheckbox = document.getElementById(`skill_${skillKey}_proficient`);
    const expertiseToggle = document.getElementById(`skill_${skillKey}_expertise_toggle`); 
    
    const proficient = proficientCheckbox ? proficientCheckbox.checked : false;
    const hasExpertise = expertiseToggle ? expertiseToggle.classList.contains('active') : false;
    
    let skillProfBonus = 0;
    if (proficient) {
        skillProfBonus = hasExpertise ? profBonus * 2 : profBonus;
    }
    
    const totalBonusValue = modifier + skillProfBonus;
    const bonusDisplay = document.getElementById(`skill_${skillKey}_bonus`);
    if (bonusDisplay) bonusDisplay.textContent = formatBonus(totalBonusValue);

    // Controla visibilidade e estado inicial do toggle de expertise
    if (expertiseToggle) {
        if (proficient) {
            expertiseToggle.classList.remove('hidden'); // CORREÇÃO: Remove 'hidden'
            expertiseToggle.classList.add('visible');   // Adiciona 'visible' para animação de entrada
        } else {
            expertiseToggle.classList.add('hidden');    // CORREÇÃO: Adiciona 'hidden'
            expertiseToggle.classList.remove('visible', 'active', 'activating', 'deactivating');
            expertiseToggle.innerHTML = '<i data-lucide="star" class="w-4 h-4"></i>';
            if(typeof lucide !== 'undefined') lucide.createIcons({nodes: [expertiseToggle]});
        }
    }
}


function updateInitiative() {
    const dexModifierEl = document.getElementById('dexterityModifier');
    const initiativeInput = document.getElementById('initiative');
    if (dexModifierEl && initiativeInput) initiativeInput.value = dexModifierEl.value;
}

function updateSpeedBasedOnRace() {
    const raceKey = raceSelect ? raceSelect.value : null;
    const speedInput = document.getElementById('speed');
    if (raceKey && RACES[raceKey] && speedInput) speedInput.value = RACES[raceKey].speed;
    else if (speedInput) speedInput.value = "";
}

function updateRacialBonusesSummaryDisplay() {
    const raceKey = raceSelect ? raceSelect.value : null;
    let racialBonusTextSummary = "Nenhum bônus de atributo racial fixo para esta seleção.";
    if (raceKey && RACES[raceKey]) {
        const raceData = RACES[raceKey]; let increases = [];
        if (raceKey === "humano") increases.push("+1 em todos os atributos");
        else if (raceData.abilityScoreIncrease) {
            for (const attr in raceData.abilityScoreIncrease) {
                increases.push(`${ABILITIES[attr]} ${formatBonus(raceData.abilityScoreIncrease[attr])}`);
            }
        }
        if (raceKey === "meio_elfo") {
            const chaBonusInnate = RACES[raceKey].abilityScoreIncrease.charisma;
            let chaAlreadyListed = increases.some(inc => inc.startsWith(ABILITIES.charisma));
            if (!chaAlreadyListed && chaBonusInnate) increases.unshift(`${ABILITIES.charisma} ${formatBonus(chaBonusInnate)}`);
            increases.push("+1 em dois outros atributos (à escolha)");
        }
        if (increases.length > 0) racialBonusTextSummary = `Bônus da Raça (${raceData.name}): ${increases.join(', ')}.`;
    }
    if (racialBonusDisplayArea) racialBonusDisplayArea.innerHTML = `<small>${racialBonusTextSummary}</small>`;
}

function updateAutomaticProficienciesAndLanguages() {
    if (!proficienciesLanguagesText) return;
    const raceKey = raceSelect ? raceSelect.value : null;
    const classLevelStr = classLevelInput ? classLevelInput.value : "";
    const { classesInfo } = parseClassAndLevel(classLevelStr);
    let autoProficiencies = new Set(); let autoLanguages = new Set();
    if (raceKey && RACES[raceKey]) {
        RACES[raceKey].proficiencies?.forEach(p => autoProficiencies.add(p));
        RACES[raceKey].languages?.forEach(l => autoLanguages.add(l));
    }
    classesInfo.forEach(clsInfo => {
        const classData = CLASSES[clsInfo.classKey];
        if (classData) {
            classData.proficiencies?.forEach(p => autoProficiencies.add(p));
            classData.languages?.forEach(l => autoLanguages.add(l));
        }
    });
    let combinedText = "--- Proficiências & Idiomas Automáticos (Base) ---\n";
    combinedText += "Proficiências: " + (autoProficiencies.size > 0 ? Array.from(autoProficiencies).join(', ') : "Nenhuma automática") + "\n";
    combinedText += "Idiomas: " + (autoLanguages.size > 0 ? Array.from(autoLanguages).join(', ') : "Nenhum automático") + "\n";
    combinedText += "--- Adições Manuais Abaixo ---\n";
    const currentText = proficienciesLanguagesText.value;
    const userAddedParts = currentText.split("--- Adições Manuais Abaixo ---");
    const userAddedText = userAddedParts.length > 1 ? userAddedParts[1].trim() : currentText.replace(/--- Proficiências & Idiomas Automáticos \(Base\) ---[\s\S]*--- Adições Manuais Abaixo ---/gm, '').trim();
    proficienciesLanguagesText.value = combinedText + userAddedText;
}

export function calculateAllSheetBonuses() {
    updateRacialBonusesSummaryDisplay();
    updateAbilityModifiersAndDependentCalculations();
    updateArmorClass();
    updateSpellcastingCalculations();
    updateLevel1MaxHP();
    updateSpeedBasedOnRace();
    updateAutomaticProficienciesAndLanguages();
}

function updateArmorClass() {
    const armorKey = armorTypeSelect ? armorTypeSelect.value : 'none';
    const armorData = ARMOR_TYPES[armorKey];
    const dexModifierEl = document.getElementById('dexterityModifier');
    const acInput = document.getElementById('armorClass');
    if (!armorData || !dexModifierEl || !acInput) return;
    let dexModValue = parseInt(dexModifierEl.value.replace('+', '')) || 0;
    let calculatedAc = armorData.baseAc;
    if (armorData.addDex) {
        if (armorData.maxDexBonus !== null) dexModValue = Math.min(dexModValue, armorData.maxDexBonus);
        calculatedAc += dexModValue;
    }
    if (shieldEquippedCheckbox && shieldEquippedCheckbox.checked) calculatedAc += SHIELD_BONUS;
    acInput.value = calculatedAc;
}

function updateSpellcastingCalculations() {
    const spellcastingAbilityKey = spellcastingAbilitySelect ? spellcastingAbilitySelect.value : null;
    const classLevelStr = classLevelInput ? classLevelInput.value : "";
    const { totalLevel } = parseClassAndLevel(classLevelStr);
    const profBonus = getProficiencyBonus(totalLevel);
    const spellDcInput = document.getElementById('spellSaveDC');
    const spellAttackInput = document.getElementById('spellAttackBonus');
    if (!spellDcInput || !spellAttackInput) return;
    if (!spellcastingAbilityKey || !ABILITIES[spellcastingAbilityKey]) {
        spellDcInput.value = "N/A"; spellAttackInput.value = "N/A"; return;
    }
    const abilityModifierEl = document.getElementById(`${spellcastingAbilityKey}Modifier`);
    if (!abilityModifierEl) { spellDcInput.value = "N/A"; spellAttackInput.value = "N/A"; return; }
    const abilityMod = parseInt(abilityModifierEl.value.replace('+', '')) || 0;
    spellDcInput.value = 8 + profBonus + abilityMod;
    spellAttackInput.value = formatBonus(profBonus + abilityMod);
}

function updateLevel1MaxHP() {
    const classLevelStr = classLevelInput ? classLevelInput.value : "";
    const { totalLevel, classesInfo } = parseClassAndLevel(classLevelStr);
    const hpMaxInput = document.getElementById('hpMax');
    const conModifierEl = document.getElementById('constitutionModifier');
    if (!hpMaxInput || !conModifierEl ) return;
    const conMod = parseInt(conModifierEl.value.replace('+', '')) || 0;
    if (totalLevel === 1 && classesInfo.length === 1) {
        const firstClassKey = classesInfo[0].classKey;
        const classData = CLASSES[firstClassKey];
        if (classData && classData.hitDie) {
            hpMaxInput.value = classData.hitDie + conMod;
            hpMaxInput.readOnly = true;
        } else hpMaxInput.readOnly = false;
    } else hpMaxInput.readOnly = false;
}

export function populateAbilityScores() {
    const grid = document.getElementById('ability-scores-grid'); if (!grid) return; grid.innerHTML = '';
    Object.entries(ABILITIES).forEach(([key, name]) => {
        const div = document.createElement('div');
        div.className = 'p-3 rounded-xl ability-score-entry';
        div.innerHTML = `
            <label for="${key}Score" class="input-label-sheet">${name} (Base):</label>
            <div class="ability-score-input-group">
                <input type="number" id="${key}Score" name="${key}Score" class="input-field text-center text-lg flex-grow" value="10" min="1" max="30">
                <input type="text" id="${key}Modifier" name="${key}Modifier" class="input-field text-center text-lg modifier-display w-1/3" value="+0" readonly title="Modificador Total (Base + Racial)">
            </div>
        `;
        grid.appendChild(div);
        const scoreInput = document.getElementById(`${key}Score`);
        if (scoreInput) scoreInput.addEventListener('input', calculateAllSheetBonuses);
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
        if (checkbox) checkbox.addEventListener('change', calculateAllSheetBonuses);
    });
}
export function populateSkills() {
    const grid = document.getElementById('skills-grid'); if (!grid) return; grid.innerHTML = '';
    Object.entries(SKILLS).forEach(([key, skill]) => {
        const div = document.createElement('div');
        div.className = 'skill-item-wrapper';
        div.innerHTML = `
            <div class="flex items-center proficiency-item flex-grow">
                <input type="checkbox" id="skill_${key}_proficient" name="skill_${key}_proficient" class="custom-checkbox mr-2">
                <label for="skill_${key}_proficient" class="text-sm cursor-pointer hover:text-[var(--accent-color)] transition-colors">${skill.name} <span class="text-xs text-gray-500">(${ABILITIES[skill.ability].slice(0, 3)})</span></label>
            </div>
            <button type="button" id="skill_${key}_expertise_toggle" class="expertise-toggle hidden" data-skill-key="${key}" title="Ativar/Desativar Expertise">
                <i data-lucide="star" class="w-4 h-4"></i>
            </button>
            <span id="skill_${key}_bonus" class="text-sm font-semibold proficiency-bonus-display ml-2 w-10 text-right">+0</span>`;
        grid.appendChild(div);

        const profCheckbox = document.getElementById(`skill_${key}_proficient`);
        const expertiseToggle = document.getElementById(`skill_${key}_expertise_toggle`);

        if (profCheckbox && expertiseToggle) {
            profCheckbox.addEventListener('change', () => {
                const isProficient = profCheckbox.checked;
                if (isProficient) {
                    expertiseToggle.classList.remove('hidden'); // <<--- CORREÇÃO AQUI
                    expertiseToggle.classList.add('visible');
                } else {
                    expertiseToggle.classList.add('hidden'); // <<--- CORREÇÃO AQUI
                    expertiseToggle.classList.remove('visible', 'active', 'activating', 'deactivating');
                    expertiseToggle.innerHTML = '<i data-lucide="star" class="w-4 h-4"></i>';
                    if(typeof lucide !== 'undefined') lucide.createIcons({nodes: [expertiseToggle]});
                }
                calculateAllSheetBonuses();
            });

            expertiseToggle.addEventListener('click', () => {
                if (!profCheckbox.checked) return;

                const isActive = expertiseToggle.classList.toggle('active');
                expertiseToggle.classList.remove('activating', 'deactivating');
                void expertiseToggle.offsetWidth; 
                
                if (isActive) {
                    expertiseToggle.classList.add('activating');
                    expertiseToggle.innerHTML = '<i data-lucide="star" class="w-4 h-4 lucide-filled" style="fill: currentColor;"></i>';
                } else {
                    expertiseToggle.classList.add('deactivating');
                    expertiseToggle.innerHTML = '<i data-lucide="star" class="w-4 h-4"></i>';
                }
                if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [expertiseToggle] });
                
                setTimeout(() => expertiseToggle.classList.remove('activating', 'deactivating'), 300);
                calculateAllSheetBonuses();
            });
        }
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}


function getSheetFormData() {
    if (!characterSheetForm) return {};
    const formData = new FormData(characterSheetForm); const sheetData = {};
    for (let [key, value] of formData.entries()) {
        const element = characterSheetForm.elements[key];
        if (element?.type === 'checkbox' && !key.startsWith("skill_") && !key.startsWith("savingThrow_")) {
            sheetData[key] = element.checked;
        } else if (key.endsWith('Score')) {
            if (!sheetData.abilityScores) sheetData.abilityScores = {};
            const abilityName = key.replace(/Score/g, '');
            if (!sheetData.abilityScores[abilityName]) sheetData.abilityScores[abilityName] = {};
            sheetData.abilityScores[abilityName].base = parseInt(value) || 10;
        } else { sheetData[key] = value; }
    }
    sheetData.savingThrowProficiencies = {};
    Object.keys(ABILITIES).forEach(key => { const cb = document.getElementById(`savingThrow_${key}_proficient`); if (cb) sheetData.savingThrowProficiencies[key] = cb.checked; });
    sheetData.skillProficiencies = {};
    sheetData.skillExpertise = {};
    Object.keys(SKILLS).forEach(key => {
        const pCb = document.getElementById(`skill_${key}_proficient`);
        const eTg = document.getElementById(`skill_${key}_expertise_toggle`);
        if (pCb) sheetData.skillProficiencies[key] = pCb.checked;
        if (eTg) sheetData.skillExpertise[key] = eTg.classList.contains('active');
    });
    ['experiencePoints','inspiration','hpMax','hpCurrent','hpTemp'].forEach(f => { if(sheetData[f]!==undefined && sheetData[f]!=='') sheetData[f]=parseInt(sheetData[f]); else if(sheetData[f]==='') sheetData[f]=0; });
    return sheetData;
}

function populateSheetForm(sheetData) {
    if (!characterSheetForm) return;
    characterSheetForm.reset();
    const sheetIdInput = document.getElementById('sheetId');
    if (sheetIdInput) sheetIdInput.value = sheetData.id || '';
    for (const key in sheetData) {
        const field = characterSheetForm.elements[key];
        if (field && key !== 'abilityScores' && key !== 'savingThrowProficiencies' && key !== 'skillProficiencies' && key !== 'skillExpertise') {
            if (field.type === 'checkbox' && !key.startsWith("skill_") && !key.startsWith("savingThrow_")) {
                 field.checked = sheetData[key] || false;
            }
            else if (field.nodeName === 'SELECT' || field.nodeName === 'TEXTAREA' || field.type === 'text' || field.type === 'number') {
                field.value = sheetData[key] === undefined || sheetData[key] === null ? '' : sheetData[key];
            }
        }
    }
    if (sheetData.abilityScores) {
        Object.entries(sheetData.abilityScores).forEach(([abilityKey, scores]) => {
            const baseScoreEl = document.getElementById(`${abilityKey}Score`);
            if (baseScoreEl && scores.base !== undefined) baseScoreEl.value = scores.base;
        });
    } else { Object.keys(ABILITIES).forEach(key => { const el = document.getElementById(`${key}Score`); if (el) el.value = 10; }); }
    if (sheetData.savingThrowProficiencies) Object.entries(sheetData.savingThrowProficiencies).forEach(([k, v]) => { const cb = document.getElementById(`savingThrow_${k}_proficient`); if (cb) cb.checked = v; });
    
    if (sheetData.skillProficiencies) {
        Object.entries(sheetData.skillProficiencies).forEach(([key, isProficient]) => {
            const profCheckbox = document.getElementById(`skill_${key}_proficient`);
            if (profCheckbox) profCheckbox.checked = isProficient;
            
            const expertiseToggle = document.getElementById(`skill_${key}_expertise_toggle`);
            if(expertiseToggle) {
                const hasExpertise = sheetData.skillExpertise ? sheetData.skillExpertise[key] || false : false;
                if(isProficient) {
                    expertiseToggle.classList.remove('hidden'); // Garante que 'hidden' seja removido
                    expertiseToggle.classList.add('visible');
                    if(hasExpertise) {
                        expertiseToggle.classList.add('active');
                        expertiseToggle.innerHTML = '<i data-lucide="star" class="w-4 h-4 lucide-filled" style="fill: currentColor;"></i>';
                    } else {
                        expertiseToggle.classList.remove('active');
                        expertiseToggle.innerHTML = '<i data-lucide="star" class="w-4 h-4"></i>';
                    }
                } else {
                    expertiseToggle.classList.add('hidden'); // Garante que 'hidden' seja adicionado
                    expertiseToggle.classList.remove('visible', 'active');
                    expertiseToggle.innerHTML = '<i data-lucide="star" class="w-4 h-4"></i>';
                }
            }
        });
    }
    
    if (raceSelect && sheetData.race) raceSelect.value = sheetData.race;
    if (armorTypeSelect && sheetData.armorType) armorTypeSelect.value = sheetData.armorType;
    if (spellcastingAbilitySelect && sheetData.spellcastingAbility) spellcastingAbilitySelect.value = sheetData.spellcastingAbility;
    if(shieldEquippedCheckbox && sheetData.shieldEquipped !== undefined) shieldEquippedCheckbox.checked = sheetData.shieldEquipped;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    calculateAllSheetBonuses();
}


export function openSheetEditor(sheetData = null) {
    showSheetEditorUI();
    currentEditingSheetId = null;
    const sheetIdInput = document.getElementById('sheetId');
    if (sheetIdInput) sheetIdInput.value = '';
    if (sheetData && sheetData.id) {
        if (editorTitle) editorTitle.textContent = `Editando: ${sheetData.characterName || 'Ficha Existente'}`;
        populateSheetForm(sheetData);
        currentEditingSheetId = sheetData.id;
        if (sheetIdInput) sheetIdInput.value = sheetData.id;
    } else {
        if (editorTitle) editorTitle.textContent = 'Novo Pacto (Ficha)';
        populateSheetForm({});
        setTimeout(calculateAllSheetBonuses, 50);
    }
}

async function saveSheetData() {
    if (!currentUserIdForSheets) { showCustomPopup(errorPopup, "Erro Arcano!", "Não autenticado.", 4000); return; }
    const sheetData = getSheetFormData();
    // console.log("[SheetLogic DIAGNÓSTICO] Tentando salvar sheetData:", JSON.parse(JSON.stringify(sheetData)), "Para ID da ficha (se editando):", currentEditingSheetId);
    try {
        const sheetsCollectionPath = `artifacts/${currentAppIdPath}/users/${currentUserIdForSheets}/characterSheets`;
        if (currentEditingSheetId) {
            await setDoc(doc(dbInstance, sheetsCollectionPath, currentEditingSheetId), sheetData, { merge: true });
            // console.log("[SheetLogic DIAGNÓSTICO] Ficha atualizada com ID:", currentEditingSheetId);
            showCustomPopup(successPopup, "Pergaminho Atualizado!", "Alterações seladas.", 2800, showSheetListViewUI);
        } else {
            const docRef = await addDoc(collection(dbInstance, sheetsCollectionPath), sheetData);
            currentEditingSheetId = docRef.id;
            const sheetIdInput = document.getElementById('sheetId');
            if (sheetIdInput) sheetIdInput.value = currentEditingSheetId;
            // console.log("[SheetLogic DIAGNÓSTICO] Nova ficha criada com ID:", docRef.id);
            showCustomPopup(successPopup, "Novo Pacto Selado!", `Ficha "${sheetData.characterName || 'Sem Nome'}" consagrada.`, 2800, showSheetListViewUI);
        }
    } catch (e) {
        console.error("[SheetLogic ERRO] Erro ao salvar ficha:", e);
        showCustomPopup(errorPopup, "Feitiço Falhou!", `Erro ao salvar: ${e.message}.`, 5000);
    }
}

async function deleteSheet() {
    if (!currentUserIdForSheets || !sheetIdToDelete) return;
    // console.log("[SheetLogic DIAGNÓSTICO] Tentando deletar ficha ID:", sheetIdToDelete);
    try {
        await deleteDoc(doc(dbInstance, `artifacts/${currentAppIdPath}/users/${currentUserIdForSheets}/characterSheets`, sheetIdToDelete));
        showCustomPopup(successPopup, "Ficha Exilada!", "Conhecimento banido.", 2000);
    } catch (e) {
        console.error("[SheetLogic ERRO] Erro ao deletar ficha:", e);
        showCustomPopup(errorPopup, "Ritual Falhou!", `Erro ao excluir: ${e.message}.`, 3000);
    } finally {
        if (deleteConfirmModal) { deleteConfirmModal.classList.add('hidden'); const mc = deleteConfirmModal.querySelector('.card'); if (mc) mc.classList.remove('modal-animation'); }
        sheetIdToDelete = null;
    }
}

export function loadCharacterSheets() {
    if (!currentUserIdForSheets || !dbInstance || !currentAppIdPath) {
        if (characterSheetsGrid) characterSheetsGrid.innerHTML = '';
        if (noSheetsMessage) { noSheetsMessage.classList.remove('hidden'); noSheetsMessage.textContent = "Autentique-se ou aguarde a inicialização."; }
        // console.warn("[SheetLogic] Não foi possível carregar fichas: usuário não autenticado ou DB não inicializado.");
        return;
    }
    // console.log("[SheetLogic DIAGNÓSTICO] Carregando fichas para usuário:", currentUserIdForSheets, "Path:", `artifacts/${currentAppIdPath}/users/${currentUserIdForSheets}/characterSheets`);
    if (unsubscribeSheetsListener) {
        // console.log("[SheetLogic DIAGNÓSTICO] Desinscrevendo do listener de fichas anterior antes de recarregar.");
        unsubscribeSheetsListener();
        unsubscribeSheetsListener = null;
    }
    const sheetsCollectionPath = `artifacts/${currentAppIdPath}/users/${currentUserIdForSheets}/characterSheets`;
    const sheetsCollectionRef = collection(dbInstance, sheetsCollectionPath);

    unsubscribeSheetsListener = onSnapshot(sheetsCollectionRef, (querySnapshot) => {
        // console.log(`[SheetLogic DIAGNÓSTICO] onSnapshot: Recebeu ${querySnapshot.docs.length} documentos.`);
        if (characterSheetsGrid) characterSheetsGrid.innerHTML = '';
        if (querySnapshot.empty) {
            // console.log("[SheetLogic DIAGNÓSTICO] onSnapshot: Nenhuma ficha encontrada.");
            if (noSheetsMessage) { noSheetsMessage.classList.remove('hidden'); noSheetsMessage.textContent = "Nenhum grimório encontrado. Conjure um novo!"; }
        } else {
            if (noSheetsMessage) noSheetsMessage.classList.add('hidden');
            querySnapshot.forEach((docSnap) => {
                // console.log("[SheetLogic DIAGNÓSTICO] onSnapshot: Processando doc ID:", docSnap.id);
                displaySheetCard(docSnap.data(), docSnap.id);
            });
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }, (error) => {
        console.error("[SheetLogic ERRO] Erro no listener onSnapshot:", error);
        if (noSheetsMessage) { noSheetsMessage.textContent = "Erro ao carregar grimórios."; noSheetsMessage.classList.remove('hidden'); }
    });
}

function displaySheetCard(sheetData, sheetId) {
    if (!characterSheetsGrid) return;
    try {
        const raceName = sheetData.race && RACES[sheetData.race] ? RACES[sheetData.race].name : (sheetData.race || 'N/A');
        const card = document.createElement('div');
        card.className = 'card p-5 hover-card-effect transition-all duration-300 cursor-pointer slide-in-left flex flex-col';
        card.innerHTML = `
            <div class="flex-grow">
                <h4 class="font-medieval text-2xl mb-2 truncate sheet-card-title">${sheetData.characterName || 'Ficha Sem Nome'}</h4>
                <p class="text-sm text-gray-400 mb-1 truncate">Classe: ${sheetData.classLevel || 'N/A'}</p>
                <p class="text-sm text-gray-400 mb-4 truncate">Raça: ${raceName}</p>
            </div>
            <div class="flex justify-end space-x-2 mt-auto pt-3 border-t border-[var(--input-border)]">
                <button data-id="${sheetId}" class="edit-sheet-btn btn-base btn-card-action"><i data-lucide="file-pen-line" class="inline-block mr-1 h-4 w-4"></i>Editar</button>
                <button data-id="${sheetId}" class="delete-sheet-btn btn-base btn-card-action-danger"><i data-lucide="trash-2" class="inline-block mr-1 h-4 w-4"></i>Excluir</button>
            </div>
        `;
        card.addEventListener('click', (e) => {
            const targetButton = e.target.closest('button');
            if (targetButton?.classList.contains('edit-sheet-btn')) openSheetEditor({ ...sheetData, id: sheetId });
            else if (targetButton?.classList.contains('delete-sheet-btn')) {
                sheetIdToDelete = sheetId;
                if (deleteConfirmModal) { deleteConfirmModal.classList.remove('hidden'); const mc = deleteConfirmModal.querySelector('.card'); if (mc) mc.classList.add('modal-animation'); }
            } else { openSheetEditor({ ...sheetData, id: sheetId }); }
        });
        characterSheetsGrid.appendChild(card);
    } catch (error) {
        console.error("[SheetLogic ERRO] Erro ao exibir card para ID:", sheetId, error, sheetData);
    }
}

export function setupSheetEventListeners(closeEditorBtn, createNewSheetBtn, cancelEditBtn, classLevelInputEl, cancelDeleteSheetBtn, confirmDeleteSheetBtn) {
    if (characterSheetForm) characterSheetForm.addEventListener('submit', (e) => { e.preventDefault(); saveSheetData(); });
    if (closeEditorBtn) closeEditorBtn.addEventListener('click', showSheetListViewUI);
    if (createNewSheetBtn) createNewSheetBtn.addEventListener('click', () => openSheetEditor());
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', showSheetListViewUI);
    
    if (classLevelInputEl) classLevelInputEl.addEventListener('input', calculateAllSheetBonuses);
    if (raceSelect) raceSelect.addEventListener('change', calculateAllSheetBonuses); 
    if (armorTypeSelect) armorTypeSelect.addEventListener('change', updateArmorClass);
    if (shieldEquippedCheckbox) shieldEquippedCheckbox.addEventListener('change', updateArmorClass);
    if (spellcastingAbilitySelect) spellcastingAbilitySelect.addEventListener('change', updateSpellcastingCalculations);

    if (cancelDeleteSheetBtn && deleteConfirmModal) {
        cancelDeleteSheetBtn.addEventListener('click', () => {
            deleteConfirmModal.classList.add('hidden');
            const mc = deleteConfirmModal.querySelector('.card'); if (mc) mc.classList.remove('modal-animation');
            sheetIdToDelete = null;
        });
    }
    if (confirmDeleteSheetBtn) confirmDeleteSheetBtn.addEventListener('click', deleteSheet);
}