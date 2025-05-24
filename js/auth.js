import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { showCustomPopup, showAuthViewUI, showAppViewUI } from './ui.js';
import { successPopup, errorPopup } from './ui.js'; 

let authInstance;
let currentUserId = null;
let onAuthChangeCallback = null; 

export function initAuth(firebaseApp, callback) {
    authInstance = getAuth(firebaseApp);
    onAuthChangeCallback = callback;

    onAuthStateChanged(authInstance, (user) => {
        const authStatusEl = document.getElementById('auth-status');
        const loginErrorEl = document.getElementById('login-error');
        const registerErrorEl = document.getElementById('register-error');

        if (user) {
            currentUserId = user.uid;
            console.log("Cult Club Auth: Usuário autenticado. UID:", currentUserId, "Email:", user.email, "DisplayName:", user.displayName);
            const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Iniciado');
            if (authStatusEl) authStatusEl.textContent = `Bem-vindo, ó ${displayName} do Culto!`;
            
            if (onAuthChangeCallback) onAuthChangeCallback(currentUserId, true); 

            if (loginErrorEl) loginErrorEl.classList.add('hidden');
            if (registerErrorEl) registerErrorEl.classList.add('hidden');
        } else {
            currentUserId = null;
            console.log("Cult Club Auth: Nenhum usuário autenticado.");
            if (authStatusEl) authStatusEl.textContent = "";
            
            if (onAuthChangeCallback) onAuthChangeCallback(null, false); 
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });
}

export function getCurrentUserId() {
    return currentUserId;
}

export function setupAuthEventListeners(loginForm, registerForm, showRegisterBtn, showLoginBtn) {
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailEl = document.getElementById('loginEmail');
            const passwordEl = document.getElementById('loginPassword');
            const loginErrorEl = document.getElementById('login-error');
            if (!emailEl || !passwordEl) return;

            const email = emailEl.value;
            const password = passwordEl.value;

            if (loginErrorEl) {
                loginErrorEl.textContent = '';
                loginErrorEl.classList.add('hidden');
            }
            try {
                await signInWithEmailAndPassword(authInstance, email, password);
                showCustomPopup(successPopup, "Portal Reaberto!", "Você adentrou novamente os mistérios do Cult Club!", 2500);
 
            } catch (error) {
                console.error("Erro de login:", error);
                if (loginErrorEl) {
                    loginErrorEl.textContent = "Feitiço de login falhou: " + error.message.replace('Firebase: Error ', '').replace(/\(auth\/.*\)\.?/, '').trim();
                    loginErrorEl.classList.remove('hidden');
                }
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameEl = document.getElementById('registerUsername');
            const emailEl = document.getElementById('registerEmail');
            const passwordEl = document.getElementById('registerPassword');
            const registerErrorEl = document.getElementById('register-error');

            if (!usernameEl || !emailEl || !passwordEl) return;

            const username = usernameEl.value.trim();
            const email = emailEl.value;
            const password = passwordEl.value;

            if (registerErrorEl) {
                registerErrorEl.textContent = '';
                registerErrorEl.classList.add('hidden');
            }

            if (!username) {
                if (registerErrorEl) {
                    registerErrorEl.textContent = "Por favor, insira um nome de usuário para o seu pacto.";
                    registerErrorEl.classList.remove('hidden');
                }
                return;
            }

            try {
                const userCredential = await createUserWithEmailAndPassword(authInstance, email, password);
                const user = userCredential.user;
                if (user) {
                    await updateProfile(user, { displayName: username });
                    console.log("Cult Club Auth: Perfil atualizado com displayName:", username);
                    showCustomPopup(successPopup, "Iniciação Concluída!", `Seu pacto com o Cult Club como "${username}" foi selado!`, 2500);

                } else {
                    throw new Error("Usuário não criado corretamente.");
                }
            } catch (error) {
                console.error("Erro de registro:", error);
                if (registerErrorEl) {
                    registerErrorEl.textContent = "Pacto de iniciação falhou: " + error.message.replace('Firebase: Error ', '').replace(/\(auth\/.*\)\.?/, '').trim();
                    registerErrorEl.classList.remove('hidden');
                }
            }
        });
    }

    if (showRegisterBtn && loginForm && registerForm) {
        showRegisterBtn.addEventListener('click', () => {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        });
    }
    if (showLoginBtn && loginForm && registerForm) {
        showLoginBtn.addEventListener('click', () => {
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        });
    }
}


export async function handleLogout(toggleFabMenuFunc) {
    if (!authInstance) return;
    try {
        await signOut(authInstance);
        if (toggleFabMenuFunc && typeof toggleFabMenuFunc === 'function') {

            const fabMainButton = document.getElementById('fab-main-button');
            if (fabMainButton && fabMainButton.classList.contains('active')) {
                toggleFabMenuFunc();
            }
        }

    } catch (error) {
        console.error("Erro ao sair:", error);
        showCustomPopup(errorPopup, "Ritual Interrompido", "Erro ao tentar quebrar o pacto (sair).", 3000);
    }
}