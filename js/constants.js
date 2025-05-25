
export const ABILITIES = {
    strength: "Força", dexterity: "Destreza", constitution: "Constituição",
    intelligence: "Inteligência", wisdom: "Sabedoria", charisma: "Carisma"
};

export const SKILLS = {
    acrobatics: { name: "Acrobacia", ability: "dexterity" },
    animalHandling: { name: "Adestrar Animais", ability: "wisdom" },
    arcana: { name: "Arcanismo", ability: "intelligence" },
    athletics: { name: "Atletismo", ability: "strength" },
    deception: { name: "Enganação", ability: "charisma" },
    history: { name: "História", ability: "intelligence" },
    insight: { name: "Intuição", ability: "wisdom" },
    intimidation: { name: "Intimidação", ability: "charisma" },
    investigation: { name: "Investigação", ability: "intelligence" },
    medicine: { name: "Medicina", ability: "wisdom" },
    nature: { name: "Natureza", ability: "intelligence" },
    perception: { name: "Percepção", ability: "wisdom" },
    performance: { name: "Atuação", ability: "charisma" },
    persuasion: { name: "Persuasão", ability: "charisma" },
    religion: { name: "Religião", ability: "intelligence" },
    sleightOfHand: { name: "Prestidigitação", ability: "dexterity" },
    stealth: { name: "Furtividade", ability: "dexterity" },
    survival: { name: "Sobrevivência", ability: "wisdom" }
};

export const RACES = {
    anao: {
        name: "Anão",
        speed: 7.5,
        abilityScoreIncrease: { constitution: 2 },
        languages: ["Comum", "Anão"],
        proficiencies: ["Machados de Batalha", "Machadinhas", "Martelos Leves", "Martelos de Guerra", "Ferramentas de Ferreiro, Cervejeiro ou Maçom (à escolha)"],
        otherTraits: ["Visão no Escuro", "Resistência dos Anões (Vantagem em TRs vs Veneno, Resistência a dano de veneno)", "Treinamento de Combate dos Anões", "Especialização em Rochas"]
    },
    elfo: {
        name: "Elfo",
        speed: 9,
        abilityScoreIncrease: { dexterity: 2 },
        languages: ["Comum", "Élfico"],
        proficiencies: ["Percepção"],
        otherTraits: ["Visão no Escuro", "Ancestralidade Feérica (Vantagem em TRs vs Encantamento, Imunidade a sono mágico)", "Transe"]
    },
    halfling: {
        name: "Halfling",
        speed: 7.5,
        abilityScoreIncrease: { dexterity: 2 },
        languages: ["Comum", "Halfling"],
        proficiencies: [],
        otherTraits: ["Sortudo (Rerolar 1s em ataque, teste de atributo, TR)", "Bravura (Vantagem em TRs vs amedrontamento)", "Agilidade Halfling (Mover-se através do espaço de criaturas maiores)"]
    },
    humano: {
        name: "Humano",
        speed: 9,
        abilityScoreIncrease: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
        languages: ["Comum", "Um idioma adicional à escolha"],
        proficiencies: [],
        otherTraits: []
    },
    draconato: {
        name: "Draconato",
        speed: 9,
        abilityScoreIncrease: { strength: 2, charisma: 1 },
        languages: ["Comum", "Dracônico"],
        proficiencies: [],
        otherTraits: ["Herança Dracônica (Escolha uma cor - determina tipo de dano e forma do sopro)", "Sopro de Dragão", "Resistência a Dano (do tipo da herança)"]
    },
    gnomo: {
        name: "Gnomo",
        speed: 7.5,
        abilityScoreIncrease: { intelligence: 2 },
        languages: ["Comum", "Gnômico"],
        proficiencies: [],
        otherTraits: ["Visão no Escuro", "Esperteza Gnômica (Vantagem em TRs de INT, SAB, CAR vs magia)"]
    },
    meio_elfo: {
        name: "Meio-Elfo",
        speed: 9,
        abilityScoreIncrease: { charisma: 2 }, 
        languages: ["Comum", "Élfico", "Um idioma adicional à escolha"],
        proficiencies: [], 
        otherTraits: ["Visão no Escuro", "Ancestralidade Feérica", "Versatilidade em Perícia (Proficiência em duas perícias à escolha)"]
    },
    meio_orc: {
        name: "Meio-Orc",
        speed: 9,
        abilityScoreIncrease: { strength: 2, constitution: 1 },
        languages: ["Comum", "Órquico"],
        proficiencies: ["Intimidação"],
        otherTraits: ["Visão no Escuro", "Ameaçador", "Resistência Implacável (Cai a 1 PV em vez de 0, uma vez por descanso longo)", "Ataques Selvagens (Rola um dado de dano adicional em acerto crítico corpo a corpo)"]
    },
    tiefling: {
        name: "Tiefling",
        speed: 9,
        abilityScoreIncrease: { intelligence: 1, charisma: 2 },
        languages: ["Comum", "Infernal"],
        proficiencies: [],
        otherTraits: ["Visão no Escuro", "Resistência Infernal (Resistência a dano de fogo)", "Legado Infernal (Truque Taumaturgia, e magias de nível mais alto depois)"]
    }
};

export const CLASSES = {
    barbaro: {
        name: "Bárbaro",
        hitDie: 12,
        savingThrowProficiencies: ["strength", "constitution"],
        proficiencies: ["Armaduras Leves", "Armaduras Médias", "Escudos", "Armas Simples", "Armas Marciais"],
        skillChoices: { amount: 2, from: ["animalHandling", "athletics", "intimidation", "nature", "perception", "survival"] },
        spellcastingAbility: null,
        languages: []
    },
    bardo: {
        name: "Bardo",
        hitDie: 8,
        savingThrowProficiencies: ["dexterity", "charisma"],
        proficiencies: ["Armaduras Leves", "Armas Simples", "Bestas de Mão", "Espadas Longas", "Rapieiras", "Espadas Curtas"],
        skillChoices: { amount: 3, from: Object.keys(SKILLS) },
        spellcastingAbility: "charisma",
        languages: []
    },
    clerigo: {
        name: "Clérigo",
        hitDie: 8,
        savingThrowProficiencies: ["wisdom", "charisma"],
        proficiencies: ["Armaduras Leves", "Armaduras Médias", "Escudos", "Armas Simples"],
        skillChoices: { amount: 2, from: ["history", "insight", "medicine", "persuasion", "religion"] },
        spellcastingAbility: "wisdom",
        languages: []
    },
    druida: {
        name: "Druida",
        hitDie: 8,
        savingThrowProficiencies: ["intelligence", "wisdom"],
        proficiencies: ["Armaduras Leves (não metálicas)", "Armaduras Médias (não metálicas)", "Escudos (não metálicos)", "Clavas", "Adagas", "Dardos", "Azagaias", "Maças", "Bordões", "Cimitarras", "Foices", "Fundas", "Lanças"],
        skillChoices: { amount: 2, from: ["arcana", "animalHandling", "insight", "medicine", "nature", "perception", "religion", "survival"] },
        spellcastingAbility: "wisdom",
        languages: ["Druídico"]
    },
    guerreiro: {
        name: "Guerreiro",
        hitDie: 10,
        savingThrowProficiencies: ["strength", "constitution"],
        proficiencies: ["Todas as Armaduras", "Escudos", "Armas Simples", "Armas Marciais"],
        skillChoices: { amount: 2, from: ["acrobatics", "animalHandling", "athletics", "history", "insight", "intimidation", "perception", "survival"] },
        spellcastingAbility: null,
        languages: []
    },
    monge: {
        name: "Monge",
        hitDie: 8,
        savingThrowProficiencies: ["strength", "dexterity"],
        proficiencies: ["Armas Simples", "Espadas Curtas"],
        skillChoices: { amount: 2, from: ["acrobatics", "athletics", "history", "insight", "religion", "stealth"] },
        spellcastingAbility: "wisdom", 
        languages: []
    },
    paladino: {
        name: "Paladino",
        hitDie: 10,
        savingThrowProficiencies: ["wisdom", "charisma"],
        proficiencies: ["Todas as Armaduras", "Escudos", "Armas Simples", "Armas Marciais"],
        skillChoices: { amount: 2, from: ["athletics", "insight", "intimidation", "medicine", "persuasion", "religion"] },
        spellcastingAbility: "charisma",
        languages: []
    },
    patrulheiro: {
        name: "Patrulheiro",
        hitDie: 10,
        savingThrowProficiencies: ["strength", "dexterity"],
        proficiencies: ["Armaduras Leves", "Armaduras Médias", "Escudos", "Armas Simples", "Armas Marciais"],
        skillChoices: { amount: 3, from: ["animalHandling", "athletics", "insight", "investigation", "nature", "perception", "stealth", "survival"] },
        spellcastingAbility: "wisdom",
        languages: []
    },
    ladino: {
        name: "Ladino",
        hitDie: 8,
        savingThrowProficiencies: ["dexterity", "intelligence"],
        proficiencies: ["Armaduras Leves", "Armas Simples", "Bestas de Mão", "Espadas Longas", "Rapieiras", "Espadas Curtas", "Ferramentas de Ladrão"],
        skillChoices: { amount: 4, from: ["acrobatics", "athletics", "deception", "insight", "intimidation", "investigation", "perception", "performance", "persuasion", "sleightOfHand", "stealth"] },
        spellcastingAbility: null,
        languages: ["Linguagem de Ladrão (Thieves' Cant)"]
    },
    feiticeiro: {
        name: "Feiticeiro",
        hitDie: 6,
        savingThrowProficiencies: ["constitution", "charisma"],
        proficiencies: ["Adagas", "Dardos", "Fundas", "Bordões", "Bestas Leves"],
        skillChoices: { amount: 2, from: ["arcana", "deception", "insight", "intimidation", "persuasion", "religion"] },
        spellcastingAbility: "charisma",
        languages: []
    },
    bruxo: {
        name: "Bruxo",
        hitDie: 8,
        savingThrowProficiencies: ["wisdom", "charisma"],
        proficiencies: ["Armaduras Leves", "Armas Simples"],
        skillChoices: { amount: 2, from: ["arcana", "deception", "history", "intimidation", "investigation", "nature", "religion"] },
        spellcastingAbility: "charisma",
        languages: []
    },
    mago: {
        name: "Mago",
        hitDie: 6,
        savingThrowProficiencies: ["intelligence", "wisdom"],
        proficiencies: ["Adagas", "Dardos", "Fundas", "Bordões", "Bestas Leves"],
        skillChoices: { amount: 2, from: ["arcana", "history", "insight", "investigation", "medicine", "religion"] },
        spellcastingAbility: "intelligence",
        languages: []
    }
};

export const ARMOR_TYPES = {
    none: { name: "Sem Armadura", type: "none", baseAc: 10, addDex: true, maxDexBonus: null, stealthDisadvantage: false, strengthReq: 0 },
    padded: { name: "Acolchoada", type: "light", baseAc: 11, addDex: true, maxDexBonus: null, stealthDisadvantage: true, strengthReq: 0 },
    leather: { name: "Couro", type: "light", baseAc: 11, addDex: true, maxDexBonus: null, stealthDisadvantage: false, strengthReq: 0 },
    studded_leather: { name: "Couro Batido", type: "light", baseAc: 12, addDex: true, maxDexBonus: null, stealthDisadvantage: false, strengthReq: 0 },
    hide: { name: "Peles", type: "medium", baseAc: 12, addDex: true, maxDexBonus: 2, stealthDisadvantage: false, strengthReq: 0 },
    chain_shirt: { name: "Cota de Malha Curta", type: "medium", baseAc: 13, addDex: true, maxDexBonus: 2, stealthDisadvantage: false, strengthReq: 0 },
    scale_mail: { name: "Brunea", type: "medium", baseAc: 14, addDex: true, maxDexBonus: 2, stealthDisadvantage: true, strengthReq: 0 },
    breastplate: { name: "Peitoral de Aço", type: "medium", baseAc: 14, addDex: true, maxDexBonus: 2, stealthDisadvantage: false, strengthReq: 0 },
    half_plate: { name: "Meia Armadura", type: "medium", baseAc: 15, addDex: true, maxDexBonus: 2, stealthDisadvantage: true, strengthReq: 0 },
    ring_mail: { name: "Cota de Anéis", type: "heavy", baseAc: 14, addDex: false, maxDexBonus: 0, stealthDisadvantage: true, strengthReq: 0 },
    chain_mail: { name: "Cota de Malha", type: "heavy", baseAc: 16, addDex: false, maxDexBonus: 0, stealthDisadvantage: true, strengthReq: 13 },
    splint: { name: "Talas", type: "heavy", baseAc: 17, addDex: false, maxDexBonus: 0, stealthDisadvantage: true, strengthReq: 15 },
    plate: { name: "Placas", type: "heavy", baseAc: 18, addDex: false, maxDexBonus: 0, stealthDisadvantage: true, strengthReq: 15 }
};

export const SHIELD_BONUS = 2;

export const SPELLCASTING_ABILITIES_OPTIONS = { 
    "": "Nenhum/Não Aplicável", 
    intelligence: "Inteligência",
    wisdom: "Sabedoria",
    charisma: "Carisma"
    };