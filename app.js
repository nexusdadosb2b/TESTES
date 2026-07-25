import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app-check.js";

function sanitizeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
}

const firebaseConfig = {
    apiKey: "AIzaSyDB81varVquhypzkLfbf6bf2RiNX4fcPL4",
    authDomain: "promoprint-maker.firebaseapp.com",
    projectId: "promoprint-maker",
    storageBucket: "promoprint-maker.firebasestorage.app", 
    messagingSenderId: "218054208443",
    appId: "1:218054208443:web:5e1098858d03609e8bf29e"
};

const appId = 'poster-maker-app';
let app, auth, db;
let currentUser = null;
let currentSessionId = null;
let currentProjectId = null; 
let loadedProjectName = ""; 
let unsubscribeProjects = null;
let sessionUnsubscribe = null;

try { 
    app = initializeApp(firebaseConfig); 
    auth = getAuth(app); 
    db = getFirestore(app); 

    initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider('6LfbumQtAAAAAGWoge1WyYETd7JADaOWqmdqn8X7'),
        isTokenAutoRefreshEnabled: true
    });

} catch (e) { console.warn("Erro na inicialização do Firebase ou App Check", e); }

const state = {
    headerImg: null, footerImg: null, logoImg: null, clubLogoImg: null, products: [], 
    settings: {
        themeMode: 'image', posterBgColor: "#ffffff",
        autoThemeHeaderBg: "#ef4444", autoThemeFooterBg: "#dc2626", autoThemeTextColor: "#fef08a",
        autoThemeText: "OFERTA IMPERDÍVEL", autoThemeSecondaryText: "APROVEITE NOSSAS PROMOÇÕES",
        autoTitleScale: 100, autoSubScale: 100, fontFamily: "'Anton', sans-serif",
        prodColor: "#1f2937", priceColor: "#ef4444", prodFontScale: 100, priceFontScale: 100, layout: 1,
        logoX: 2, logoY: 2, logoW: 28,
        promoType: 'normal', priceRegularColor: "#9ca3af", priceRegularFontScale: 100,
        textPromoDe: "PREÇO NORMAL R$", textPromoPor: "POR",
        textClubNormal: "CLIENTE", textClubPromo: "CLUBE", clubLogoGlobalScale: 100
    }
};

const els = {
    loginOverlay: document.getElementById('loginOverlay'), 
    appSidebar: document.getElementById('appSidebar'), 
    appMain: document.getElementById('appMain'), 
    loginForm: document.getElementById('loginForm'),
    loginEmail: document.getElementById('loginEmail'), loginPassword: document.getElementById('loginPassword'),
    loginBtn: document.getElementById('loginBtn'), loginError: document.getElementById('loginError'), logoutBtn: document.getElementById('logoutBtn'),
    headerUpload: document.getElementById('headerUpload'), footerUpload: document.getElementById('footerUpload'),
    clearHeaderBtn: document.getElementById('clearHeaderBtn'), clearFooterBtn: document.getElementById('clearFooterBtn'),
    logoUpload: document.getElementById('logoUpload'), clearLogoBtn: document.getElementById('clearLogoBtn'),
    clubLogoUpload: document.getElementById('clubLogoUpload'), clearClubLogoBtn: document.getElementById('clearClubLogoBtn'), clubLogoGlobalScale: document.getElementById('clubLogoGlobalScale'), clubLogoSizeDisplay: document.getElementById('clubLogoSizeDisplay'),
    posterBgColor: document.getElementById('posterBgColor'), tabImgBtn: document.getElementById('tabImgBtn'), tabAutoBtn: document.getElementById('tabAutoBtn'), panelImage: document.getElementById('panelImage'), panelAuto: document.getElementById('panelAuto'), presetBtns: document.querySelectorAll('.preset-btn'),
    autoHeaderBg: document.getElementById('autoHeaderBg'), autoTextColor: document.getElementById('autoTextColor'), autoFooterBg: document.getElementById('autoFooterBg'), autoThemeText: document.getElementById('autoThemeText'), autoThemeSecondaryText: document.getElementById('autoThemeSecondaryText'), autoTitleScale: document.getElementById('autoTitleScale'), autoSubScale: document.getElementById('autoSubScale'), autoTitleSizeDisplay: document.getElementById('autoTitleSizeDisplay'), autoSubSizeDisplay: document.getElementById('autoSubSizeDisplay'), excelUpload: document.getElementById('excelUpload'), excelInstructions: document.getElementById('excelInstructions'),
    fontFamily: document.getElementById('fontFamily'), prodColor: document.getElementById('prodColor'), priceColor: document.getElementById('priceColor'), prodFontSizeScale: document.getElementById('prodFontSizeScale'), priceFontSizeScale: document.getElementById('priceFontSizeScale'), prodFontSizeDisplay: document.getElementById('prodFontSizeDisplay'), priceFontSizeDisplay: document.getElementById('priceFontSizeDisplay'), layoutBtns: document.querySelectorAll('.layout-btn'),
    printBtn: document.getElementById('printBtn'), previewContainer: document.getElementById('previewContainer'), pageCountDisplay: document.getElementById('pageCountDisplay'), dynamicPrintStyle: document.getElementById('dynamicPrintStyle'), toastContainer: document.getElementById('toastContainer'),
    projectName: document.getElementById('projectName'), saveProjectBtn: document.getElementById('saveProjectBtn'), savedProjectsList: document.getElementById('savedProjectsList'), cloudStatus: document.getElementById('cloudStatus'),
    manualProdName: document.getElementById('manualProdName'), manualProdPrice: document.getElementById('manualProdPrice'), manualProdPriceRegular: document.getElementById('manualProdPriceRegular'), addManualBtn: document.getElementById('addManualBtn'), clearProductsBtn: document.getElementById('clearProductsBtn'), newProjectBtn: document.getElementById('newProjectBtn'),
    promoType: document.getElementById('promoType'), promoSettings: document.getElementById('promoSettings'), textPromoDe: document.getElementById('textPromoDe'), textPromoPor: document.getElementById('textPromoPor'), priceRegularColor: document.getElementById('priceRegularColor'), priceRegularFontSizeScale: document.getElementById('priceRegularFontSizeScale'), priceRegularSizeDisplay: document.getElementById('priceRegularSizeDisplay'),
    textPromo1: document.getElementById('textPromo1'), textPromo2: document.getElementById('textPromo2'), clubLogoControl: document.getElementById('clubLogoControl'),
    textClubNormal: document.getElementById('textClubNormal'), textClubPromo: document.getElementById('textClubPromo'), clubTextControl: document.getElementById('clubTextControl'), dePorTextControl: document.getElementById('dePorTextControl')
};

els.appSidebar.remove();
els.appMain.remove();
els.toastContainer.remove();

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const bgColors = { 'success': 'bg-green-600', 'error': 'bg-red-600', 'info': 'bg-blue-600' };
    toast.className = `${bgColors[type]} text-white px-4 py-3 rounded shadow-lg transition-opacity duration-300 ease-in-out opacity-0 flex items-center justify-between min-w-[250px] font-bold text-sm`;
    toast.innerHTML = `<span>${message}</span>`;
    els.toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.remove('opacity-0'));
    setTimeout(() => { toast.classList.add('opacity-0'); setTimeout(() => toast.remove(), 300); }, 3000);
}

if (auth) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            document.body.appendChild(els.toastContainer);
            document.body.appendChild(els.appSidebar);
            document.body.appendChild(els.appMain);
            
            currentUser = user; 
            els.loginOverlay.classList.add('hidden'); 
            els.logoutBtn.classList.remove('hidden');
            
            els.cloudStatus.textContent = 'Nuvem Conectada'; els.cloudStatus.className = 'text-[10px] font-bold bg-green-100 text-green-800 px-2 py-1 rounded-full border border-green-200';
            currentSessionId = crypto.randomUUID(); const sessionRef = doc(db, 'sessions', user.uid);
            await setDoc(sessionRef, { sessionId: currentSessionId, lastLogin: serverTimestamp() });
            if (sessionUnsubscribe) sessionUnsubscribe();
            sessionUnsubscribe = onSnapshot(sessionRef, (docSnap) => { if (docSnap.exists() && docSnap.data().sessionId !== currentSessionId) { signOut(auth).then(() => { alert("🚨 VOCÊ FOI DESCONECTADO!"); window.location.reload(); }); } });
            loadSavedProjects();
        } else {
            els.appSidebar.remove();
            els.appMain.remove();
            els.toastContainer.remove();

            currentUser = null; 
            els.loginOverlay.classList.remove('hidden'); 
            els.logoutBtn.classList.add('hidden');
            els.savedProjectsList.innerHTML = '<li class="p-3 text-gray-500 text-center italic text-xs">Aguardando login...</li>';
            if (sessionUnsubscribe) sessionUnsubscribe();
            els.loginBtn.textContent = "Entrar no Sistema"; els.loginBtn.disabled = false; els.loginForm.reset(); els.loginError.classList.add('hidden');
            
            currentProjectId = null; loadedProjectName = ""; els.projectName.value = '';
            state.products = [];
            state.logoImg = null; els.logoUpload.value = ''; els.clearLogoBtn.classList.add('hidden');
            state.clubLogoImg = null; els.clubLogoUpload.value = ''; els.clearClubLogoBtn.classList.add('hidden');
            state.headerImg = null; els.headerUpload.value = ''; els.clearHeaderBtn.classList.add('hidden');
            state.footerImg = null; els.footerUpload.value = ''; els.clearFooterBtn.classList.add('hidden');
            
            els.manualProdName.value = ''; els.manualProdPrice.value = ''; els.manualProdPriceRegular.value = ''; els.excelUpload.value = '';
            state.settings = { themeMode: 'image', posterBgColor: "#ffffff", autoThemeHeaderBg: "#ef4444", autoThemeFooterBg: "#dc2626", autoThemeTextColor: "#fef08a", autoThemeText: "OFERTA IMPERDÍVEL", autoThemeSecondaryText: "APROVEITE NOSSAS PROMOÇÕES", autoTitleScale: 100, autoSubScale: 100, fontFamily: "'Anton', sans-serif", prodColor: "#1f2937", priceColor: "#ef4444", prodFontScale: 100, priceFontScale: 100, layout: 1, logoX: 2, logoY: 2, logoW: 28, promoType: 'normal', priceRegularColor: "#9ca3af", priceRegularFontScale: 100, textPromoDe: "PREÇO NORMAL R$", textPromoPor: "POR", textClubNormal: "CLIENTE", textClubPromo: "CLUBE", clubLogoGlobalScale: 100 };
            
            switchTab('image'); els.promoType.value = 'normal'; updatePromoUI();
            els.posterBgColor.value = "#ffffff"; els.autoHeaderBg.value = "#ef4444"; els.autoTextColor.value = "#fef08a"; els.autoFooterBg.value = "#dc2626"; els.autoThemeText.value = "OFERTA IMPERDÍVEL"; els.autoThemeSecondaryText.value = "APROVEITE NOSSAS PROMOÇÕES"; els.fontFamily.value = "'Anton', sans-serif"; els.prodColor.value = "#1f2937"; els.priceColor.value = "#ef4444"; els.priceRegularColor.value = "#9ca3af";
            els.prodFontSizeScale.value = 100; els.priceFontSizeScale.value = 100; els.priceRegularFontSizeScale.value = 100; els.clubLogoGlobalScale.value = 100; els.autoTitleScale.value = 100; els.autoSubScale.value = 100;
            els.prodFontSizeDisplay.textContent = "100%"; els.priceFontSizeDisplay.textContent = "100%"; els.priceRegularSizeDisplay.textContent = "100%"; els.clubLogoSizeDisplay.textContent = "100%"; els.autoTitleSizeDisplay.textContent = "100%"; els.autoSubSizeDisplay.textContent = "100%";
            
            els.layoutBtns.forEach(b => { if (parseInt(b.dataset.layout) === 1) { b.classList.add('border-blue-600', 'bg-blue-50', 'text-blue-700', 'border-2'); b.classList.remove('border-gray-300', 'bg-white', 'text-gray-600', 'border'); } else { b.classList.remove('border-blue-600', 'bg-blue-50', 'text-blue-700', 'border-2'); b.classList.add('border-gray-300', 'bg-white', 'text-gray-600', 'border'); } });
            renderPosters();
        }
    });
}

els.loginForm.addEventListener('submit', (e) => { e.preventDefault(); els.loginBtn.textContent = "Validando..."; els.loginBtn.disabled = true; signInWithEmailAndPassword(auth, els.loginEmail.value, els.loginPassword.value).catch(err => { els.loginError.textContent = "Dados incorretos ou conta inexistente."; els.loginError.classList.remove('hidden'); els.loginBtn.textContent = "Entrar no Sistema"; els.loginBtn.disabled = false; }); });
els.logoutBtn.addEventListener('click', () => { if(confirm("Deseja sair do sistema?")) signOut(auth); });

function loadSavedProjects() {
    if (!currentUser) return;
    const projectsRef = collection(db, 'artifacts', appId, 'users', currentUser.uid, 'campaigns');
    if (unsubscribeProjects) unsubscribeProjects();
    unsubscribeProjects = onSnapshot(projectsRef, (snapshot) => {
        els.savedProjectsList.innerHTML = '';
        if (snapshot.empty) return els.savedProjectsList.innerHTML = '<li class="p-3 text-gray-500 text-center italic">Nenhum cartaz salvo.</li>';
        snapshot.forEach(docSnap => {
            const data = docSnap.data(); const li = document.createElement('li');
            li.className = 'p-3 flex justify-between items-center hover:bg-gray-50 border-b text-sm transition';
            li.innerHTML = `<span class="font-bold text-gray-700 truncate w-1/2">${sanitizeHTML(data.name)}</span>`;
            const actionsDiv = document.createElement('div'); actionsDiv.className = 'flex gap-2';
            const loadBtn = document.createElement('button'); loadBtn.textContent = 'Abrir'; loadBtn.className = 'text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded font-bold border border-blue-200'; loadBtn.onclick = () => loadProjectData(docSnap.id, data);
            const delBtn = document.createElement('button'); delBtn.innerHTML = `✕`; delBtn.className = 'text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold border border-red-200'; delBtn.onclick = () => deleteProject(docSnap.id);
            actionsDiv.append(loadBtn, delBtn); li.appendChild(actionsDiv); els.savedProjectsList.appendChild(li);
        });
    });
}

async function saveCurrentProject() {
    if (!currentUser) return showToast("Faça login para salvar.", "error");
    const name = els.projectName.value.trim(); if (!name) return showToast("Dê um nome para sua campanha.", "error");

    els.saveProjectBtn.disabled = true; els.saveProjectBtn.textContent = 'Salvando...';
    try {
        let projectId = currentProjectId; if (currentProjectId && name !== loadedProjectName) projectId = crypto.randomUUID(); else if (!currentProjectId) projectId = crypto.randomUUID();
        
        await setDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'campaigns', projectId), { 
            name, 
            headerImg: state.headerImg, 
            footerImg: state.footerImg, 
            logoImg: state.logoImg, 
            clubLogoImg: state.clubLogoImg, 
            products: state.products, 
            settings: state.settings, 
            updatedAt: serverTimestamp(),
            savedBySession: currentSessionId 
        });
        
        currentProjectId = projectId; loadedProjectName = name; showToast("Campanha salva com sucesso!", "success");
    } catch (error) { 
        showToast("Erro ao salvar.", "error"); 
    } finally { 
        els.saveProjectBtn.disabled = false; els.saveProjectBtn.textContent = 'Salvar'; 
    }
}

function loadProjectData(id, data) {
    currentProjectId = id; loadedProjectName = data.name || ''; els.projectName.value = loadedProjectName;
    state.headerImg = data.headerImg || null; state.footerImg = data.footerImg || null; state.logoImg = data.logoImg || null; state.clubLogoImg = data.clubLogoImg || null; state.products = data.products || [];
    
    if(state.logoImg) els.clearLogoBtn.classList.remove('hidden'); else els.clearLogoBtn.classList.add('hidden');
    if(state.clubLogoImg) els.clearClubLogoBtn.classList.remove('hidden'); else els.clearClubLogoBtn.classList.add('hidden');
    if(state.headerImg) els.clearHeaderBtn.classList.remove('hidden'); else els.clearHeaderBtn.classList.add('hidden');
    if(state.footerImg) els.clearFooterBtn.classList.remove('hidden'); else els.clearFooterBtn.classList.add('hidden');

    if (data.settings) state.settings = { ...state.settings, ...data.settings };
    switchTab(state.settings.themeMode);
    
    els.promoType.value = state.settings.promoType || 'normal'; updatePromoUI();
    els.posterBgColor.value = state.settings.posterBgColor; els.autoHeaderBg.value = state.settings.autoThemeHeaderBg; els.autoTextColor.value = state.settings.autoThemeTextColor; els.autoFooterBg.value = state.settings.autoThemeFooterBg;
    els.autoThemeText.value = state.settings.autoThemeText; els.autoThemeSecondaryText.value = state.settings.autoThemeSecondaryText; els.autoTitleScale.value = state.settings.autoTitleScale; els.autoSubScale.value = state.settings.autoSubScale;
    els.autoTitleSizeDisplay.textContent = `${state.settings.autoTitleScale}%`; els.autoSubSizeDisplay.textContent = `${state.settings.autoSubScale}%`;
    els.fontFamily.value = state.settings.fontFamily; els.prodColor.value = state.settings.prodColor; els.priceColor.value = state.settings.priceColor;
    els.prodFontSizeScale.value = state.settings.prodFontScale; els.priceFontSizeScale.value = state.settings.priceFontScale;
    els.prodFontSizeDisplay.textContent = `${state.settings.prodFontScale}%`; els.priceFontSizeDisplay.textContent = `${state.settings.priceFontScale}%`;
    
    els.textPromoDe.value = state.settings.textPromoDe || "PREÇO NORMAL R$"; els.textPromoPor.value = state.settings.textPromoPor || "POR";
    els.textClubNormal.value = state.settings.textClubNormal || "CLIENTE"; els.textClubPromo.value = state.settings.textClubPromo || "CLUBE";
    els.priceRegularColor.value = state.settings.priceRegularColor || "#9ca3af";
    els.priceRegularFontSizeScale.value = state.settings.priceRegularFontScale || 100; els.priceRegularSizeDisplay.textContent = `${state.settings.priceRegularFontScale || 100}%`;
    els.clubLogoGlobalScale.value = state.settings.clubLogoGlobalScale || 100; els.clubLogoSizeDisplay.textContent = `${state.settings.clubLogoGlobalScale || 100}%`;

    els.layoutBtns.forEach(b => {
        if (parseInt(b.dataset.layout) === state.settings.layout) { b.classList.add('border-blue-600', 'bg-blue-50', 'text-blue-700', 'border-2'); b.classList.remove('border-gray-300', 'bg-white', 'text-gray-600', 'border'); } 
        else { b.classList.remove('border-blue-600', 'bg-blue-50', 'text-blue-700', 'border-2'); b.classList.add('border-gray-300', 'bg-white', 'text-gray-600', 'border'); }
    });
    renderPosters(); showToast("Campanha carregada!", "success");
}

async function deleteProject(id) {
    if (!currentUser) return;
    if(confirm("Excluir permanentemente?")) { await deleteDoc(doc(db, 'artifacts', appId, 'users', currentUser.uid, 'campaigns', id)); if (currentProjectId === id) { currentProjectId = null; loadedProjectName = ""; els.projectName.value = ''; } showToast("Excluída.", "info"); }
}

let newProjectConfirmTimeout, clearProductsConfirmTimeout;
els.newProjectBtn.addEventListener('click', () => {
    if (els.newProjectBtn.dataset.confirm === 'true') {
        els.newProjectBtn.dataset.confirm = 'false'; els.newProjectBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg> CRIAR NOVO PROJETO (Limpar Tudo)`; els.newProjectBtn.classList.remove('bg-red-600', 'text-white', 'hover:bg-red-700'); clearTimeout(newProjectConfirmTimeout);
        
        currentProjectId = null; loadedProjectName = ""; els.projectName.value = '';
        state.products = [];
        state.logoImg = null; els.logoUpload.value = ''; els.clearLogoBtn.classList.add('hidden');
        state.clubLogoImg = null; els.clubLogoUpload.value = ''; els.clearClubLogoBtn.classList.add('hidden');
        state.headerImg = null; els.headerUpload.value = ''; els.clearHeaderBtn.classList.add('hidden');
        state.footerImg = null; els.footerUpload.value = ''; els.clearFooterBtn.classList.add('hidden');
        
        els.manualProdName.value = ''; els.manualProdPrice.value = ''; els.manualProdPriceRegular.value = ''; els.excelUpload.value = '';
        state.settings = { themeMode: 'image', posterBgColor: "#ffffff", autoThemeHeaderBg: "#ef4444", autoThemeFooterBg: "#dc2626", autoThemeTextColor: "#fef08a", autoThemeText: "OFERTA IMPERDÍVEL", autoThemeSecondaryText: "APROVEITE NOSSAS PROMOÇÕES", autoTitleScale: 100, autoSubScale: 100, fontFamily: "'Anton', sans-serif", prodColor: "#1f2937", priceColor: "#ef4444", prodFontScale: 100, priceFontScale: 100, layout: 1, logoX: 2, logoY: 2, logoW: 28, promoType: 'normal', priceRegularColor: "#9ca3af", priceRegularFontScale: 100, textPromoDe: "PREÇO NORMAL R$", textPromoPor: "POR", textClubNormal: "CLIENTE", textClubPromo: "CLUBE", clubLogoGlobalScale: 100 };
        
        switchTab('image'); els.promoType.value = 'normal'; updatePromoUI();
        els.posterBgColor.value = "#ffffff"; els.autoHeaderBg.value = "#ef4444"; els.autoTextColor.value = "#fef08a"; els.autoFooterBg.value = "#dc2626"; els.autoThemeText.value = "OFERTA IMPERDÍVEL"; els.autoThemeSecondaryText.value = "APROVEITE NOSSAS PROMOÇÕES"; els.fontFamily.value = "'Anton', sans-serif"; els.prodColor.value = "#1f2937"; els.priceColor.value = "#ef4444"; els.priceRegularColor.value = "#9ca3af";
        els.prodFontSizeScale.value = 100; els.priceFontSizeScale.value = 100; els.priceRegularFontSizeScale.value = 100; els.clubLogoGlobalScale.value = 100; els.autoTitleScale.value = 100; els.autoSubScale.value = 100;
        els.prodFontSizeDisplay.textContent = "100%"; els.priceFontSizeDisplay.textContent = "100%"; els.priceRegularSizeDisplay.textContent = "100%"; els.clubLogoSizeDisplay.textContent = "100%"; els.autoTitleSizeDisplay.textContent = "100%"; els.autoSubSizeDisplay.textContent = "100%";
        
        els.layoutBtns.forEach(b => { if (parseInt(b.dataset.layout) === 1) { b.classList.add('border-blue-600', 'bg-blue-50', 'text-blue-700', 'border-2'); b.classList.remove('border-gray-300', 'bg-white', 'text-gray-600', 'border'); } else { b.classList.remove('border-blue-600', 'bg-blue-50', 'text-blue-700', 'border-2'); b.classList.add('border-gray-300', 'bg-white', 'text-gray-600', 'border'); } });
        renderPosters(); showToast("Novo projeto iniciado!", "success");
    } else {
        els.newProjectBtn.dataset.confirm = 'true'; els.newProjectBtn.innerHTML = `TEM CERTEZA? (CLIQUE DE NOVO)`; els.newProjectBtn.classList.add('bg-red-600', 'text-white', 'hover:bg-red-700');
        newProjectConfirmTimeout = setTimeout(() => { els.newProjectBtn.dataset.confirm = 'false'; els.newProjectBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg> CRIAR NOVO PROJETO (Limpar Tudo)`; els.newProjectBtn.classList.remove('bg-red-600', 'text-white', 'hover:bg-red-700'); }, 3000);
    }
});

els.clearProductsBtn.addEventListener('click', () => {
    if(state.products.length === 0) return;
    if (els.clearProductsBtn.dataset.confirm === 'true') {
        els.clearProductsBtn.dataset.confirm = 'false'; els.clearProductsBtn.textContent = 'Limpar Produtos'; els.clearProductsBtn.classList.remove('bg-red-600', 'text-white'); els.clearProductsBtn.classList.add('bg-red-50', 'text-red-600'); clearTimeout(clearProductsConfirmTimeout);
        state.products = []; renderPosters(); showToast("Lista limpa!", "success");
    } else {
        els.clearProductsBtn.dataset.confirm = 'true'; els.clearProductsBtn.textContent = 'TEM CERTEZA?'; els.clearProductsBtn.classList.remove('bg-red-50', 'text-red-600'); els.clearProductsBtn.classList.add('bg-red-600', 'text-white');
        clearProductsConfirmTimeout = setTimeout(() => { els.clearProductsBtn.dataset.confirm = 'false'; els.clearProductsBtn.textContent = 'Limpar Produtos'; els.clearProductsBtn.classList.remove('bg-red-600', 'text-white'); els.clearProductsBtn.classList.add('bg-red-50', 'text-red-600'); }, 3000);
    }
});

function switchTab(mode) {
    state.settings.themeMode = mode;
    if (mode === 'image') { els.tabImgBtn.classList.replace('bg-white', 'bg-blue-50'); els.tabImgBtn.classList.replace('text-gray-700', 'text-blue-700'); els.tabAutoBtn.classList.replace('bg-blue-50', 'bg-white'); els.tabAutoBtn.classList.replace('text-blue-700', 'text-gray-700'); els.panelImage.classList.remove('hidden'); els.panelAuto.classList.add('hidden'); }
    else { els.tabAutoBtn.classList.replace('bg-white', 'bg-blue-50'); els.tabAutoBtn.classList.replace('text-gray-700', 'text-blue-700'); els.tabImgBtn.classList.replace('bg-blue-50', 'bg-white'); els.tabImgBtn.classList.replace('text-blue-700', 'text-gray-700'); els.panelAuto.classList.remove('hidden'); els.panelImage.classList.add('hidden'); }
    renderPosters();
}
els.tabImgBtn.addEventListener('click', () => switchTab('image')); els.tabAutoBtn.addEventListener('click', () => switchTab('auto'));

function updatePromoUI() {
    const type = els.promoType.value; state.settings.promoType = type;
    if (type === 'normal') {
        els.manualProdPriceRegular.classList.add('hidden'); els.manualProdPrice.classList.replace('w-1/2', 'w-full'); els.promoSettings.classList.add('hidden');
    } else {
        els.manualProdPriceRegular.classList.remove('hidden'); els.manualProdPrice.classList.replace('w-full', 'w-1/2'); els.promoSettings.classList.remove('hidden');
        if (type === 'club') { 
            els.dePorTextControl.classList.add('hidden'); 
            els.clubLogoControl.classList.remove('hidden'); 
            els.clubTextControl.classList.remove('hidden'); 
        } else { 
            els.dePorTextControl.classList.remove('hidden'); 
            els.clubLogoControl.classList.add('hidden'); 
            els.clubTextControl.classList.add('hidden'); 
        }
    }
    renderPosters();
}
els.promoType.addEventListener('change', updatePromoUI);

function formatPrice(val) {
    if (val === undefined || val === null) return "0,00";
    if (typeof val === 'number') return val.toFixed(2).replace('.', ',');
    let strVal = String(val).trim(); if (strVal.includes(',')) return strVal; if (strVal.includes('.')) return strVal.replace('.', ','); return strVal;
}
function splitPrice(priceStr) { const parts = priceStr.split(','); return { intPart: parts[0] || "0", decPart: parts[1] ? "," + parts[1].substring(0,2) : ",00" }; }

function handleImageUpload(e, stateKey) {
    const file = e.target.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas'); 
            let width = img.width, height = img.height; 
            
            const MAX_WIDTH = (stateKey === 'logoImg' || stateKey === 'clubLogoImg') ? 600 : 1200; 
            if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
            
            canvas.width = width; canvas.height = height; const ctx = canvas.getContext('2d');
            
            if(stateKey !== 'logoImg' && stateKey !== 'clubLogoImg') { 
                ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, width, height); 
            }
            ctx.drawImage(img, 0, 0, width, height);
            
            const formato = (stateKey === 'logoImg' || stateKey === 'clubLogoImg') ? 'image/png' : 'image/jpeg';
            const qualidade = (formato === 'image/jpeg') ? 0.6 : undefined;
            
            state[stateKey] = canvas.toDataURL(formato, qualidade);
            
            if(stateKey === 'logoImg') els.clearLogoBtn.classList.remove('hidden');
            if(stateKey === 'clubLogoImg') els.clearClubLogoBtn.classList.remove('hidden');
            if(stateKey === 'headerImg') els.clearHeaderBtn.classList.remove('hidden');
            if(stateKey === 'footerImg') els.clearFooterBtn.classList.remove('hidden');
            renderPosters();
        }; img.src = event.target.result;
    }; reader.readAsDataURL(file);
}

function handleExcelUpload(e) {
    const file = e.target.files[0]; 
    if (!file) return; 

    if (file.size > 2 * 1024 * 1024) {
        showToast("🚨 A planilha é muito pesada (máx 2MB). Verifique o arquivo.", "error");
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const data = new Uint8Array(event.target.result); const workbook = XLSX.read(data, {type: 'array'}); 
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        
        let importedCount = 0;
        const firstRow = json[0] || {};
        const keys = Object.keys(firstRow).map(k => k.toLowerCase());
        
        const isSmart = keys.some(k => ['grande', 'médio', 'medio', 'pequeno'].includes(k));

        if (isSmart) {
            json.forEach(row => {
                const getVal = (possibleKeys) => {
                    const key = Object.keys(row).find(k => possibleKeys.includes(k.toLowerCase()));
                    return key ? row[key] : undefined;
                };
                const name = String(getVal(['produto', 'nome', 'descrição', 'descricao']) || '').trim();
                if(!name) return;
                
                const price = formatPrice(getVal(['preço 1', 'preço promo', 'promo', 'por', 'preço', 'preco']));
                const priceReg = formatPrice(getVal(['preço 2', 'preço normal', 'de', 'normal']));
                
                const qG = parseInt(getVal(['grande'])) || 0;
                const qM = parseInt(getVal(['médio', 'medio'])) || 0;
                const qP = parseInt(getVal(['pequeno'])) || 0;
                
                const createProd = (lSize) => ({
                    name: name.toUpperCase(), price, priceRegular: priceReg, forcedLayout: lSize,
                    nameTransform: { x: 0, y: 0, scale: 1 }, priceTransform: { x: 0, y: 0, scale: 1 }, priceRegularTransform: { x: 0, y: 0, scale: 1 }, prefixTransform: { x: 0, y: 0, scale: 1 }
                });

                for(let i=0; i<qG; i++) { state.products.push(createProd(1)); importedCount++; }
                for(let i=0; i<qM; i++) { state.products.push(createProd(2)); importedCount++; }
                for(let i=0; i<qP; i++) { state.products.push(createProd(4)); importedCount++; }
            });
            if(importedCount > 0) showToast(`${importedCount} cartazes gerados via Planilha Inteligente!`, "success");
        } else {
            const jsonArr = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
            for (let i = 1; i < jsonArr.length; i++) {
                const row = jsonArr[i]; 
                if (row && row[0] && row[1]) {
                    state.products.push({ 
                        name: String(row[0]).trim().toUpperCase(), price: formatPrice(row[1]), priceRegular: row[2] ? formatPrice(row[2]) : "", forcedLayout: null,
                        nameTransform: { x: 0, y: 0, scale: 1 }, priceTransform: { x: 0, y: 0, scale: 1 }, priceRegularTransform: { x: 0, y: 0, scale: 1 }, prefixTransform: { x: 0, y: 0, scale: 1 }
                    });
                    importedCount++;
                }
            }
            if(importedCount > 0) showToast(`${importedCount} produtos importados (Modo Simples)!`, "success");
        }
        
        if(importedCount === 0) showToast("Nenhum produto válido encontrado.", "error");
        renderPosters(); 
        e.target.value = ''; 
    }; reader.readAsArrayBuffer(file);
}

function renderPosters() {
    els.previewContainer.innerHTML = ''; const s = state.settings; const root = document.documentElement;
    root.style.setProperty('--font-family', s.fontFamily); root.style.setProperty('--prod-color', s.prodColor); root.style.setProperty('--price-color', s.priceColor);
    root.style.setProperty('--poster-bg', s.posterBgColor); root.style.setProperty('--logo-x', `${s.logoX}%`); root.style.setProperty('--logo-y', `${s.logoY}%`); root.style.setProperty('--logo-w', `${s.logoW}%`);
    
    let headerHTML = ''; let footerHTML = '';
    const logoHTML = state.logoImg ? `<div class="logo-container"><img src="${state.logoImg}" class="poster-logo" alt="Logo"><div class="resize-handle"></div></div>` : '';

    if (s.themeMode === 'image') {
        headerHTML = state.headerImg ? `<img src="${state.headerImg}" class="poster-header" alt="Cabeçalho">` : '';
        footerHTML = state.footerImg ? `<img src="${state.footerImg}" class="poster-footer" alt="Rodapé">` : '';
    } else {
        const tBaseAuto = 4.5 * (s.autoTitleScale / 100); const sBaseAuto = 2.0 * (s.autoSubScale / 100);
        
        headerHTML = `<div class="poster-header-auto" style="background-color: ${s.autoThemeHeaderBg}; color: ${s.autoThemeTextColor};"><span style="font-size: ${tBaseAuto}rem;">${sanitizeHTML(s.autoThemeText)}</span></div>`;
        footerHTML = `<div class="poster-footer-auto" style="background-color: ${s.autoThemeFooterBg}; color: ${s.autoThemeTextColor};"><span style="font-size: ${sBaseAuto}rem;">${sanitizeHTML(s.autoThemeSecondaryText)}</span></div>`;
    }

    if (state.products.length === 0) {
        els.pageCountDisplay.textContent = `Páginas: 0`; els.dynamicPrintStyle.innerHTML = "@page { margin: 0; }";
        els.previewContainer.innerHTML = `<div class="a4-page layout-1"><div class="poster">${logoHTML}${headerHTML}<div class="poster-body text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg><p class="font-bold text-xl mb-1">Vazio</p></div>${footerHTML}</div></div>`;
        return;
    }

    els.dynamicPrintStyle.innerHTML = `
        @page { margin: 0; }
        @page portrait_page { size: A4 portrait; margin: 0; }
        @page landscape_page { size: A4 landscape; margin: 0; }
        .layout-1 { page: portrait_page; }
        .layout-2 { page: landscape_page; }
        .layout-4 { page: portrait_page; }
    `;
    
    const pages = []; 
    const layout1Items = []; const layout2Items = []; const layout4Items = [];

    state.products.forEach((prod, originalIndex) => {
        const targetLayout = prod.forcedLayout || s.layout;
        const item = { prod, originalIndex, currentLayout: targetLayout };
        if (targetLayout === 1) layout1Items.push(item);
        else if (targetLayout === 2) layout2Items.push(item);
        else if (targetLayout === 4) layout4Items.push(item);
    });

    for (let i = 0; i < layout1Items.length; i += 1) pages.push(layout1Items.slice(i, i + 1));
    for (let i = 0; i < layout2Items.length; i += 2) pages.push(layout2Items.slice(i, i + 2));
    for (let i = 0; i < layout4Items.length; i += 4) pages.push(layout4Items.slice(i, i + 4));

    els.pageCountDisplay.textContent = `Páginas: ${pages.length}`;

    pages.forEach((pageItems) => {
        const pageLayout = pageItems[0].currentLayout;
        
        let pBase, prBase;
        if (pageLayout === 1) { pBase = 4.0; prBase = 12.0; } 
        else if (pageLayout === 2) { pBase = 3.0; prBase = 8.5; } 
        else { pBase = 2.0; prBase = 5.5; }

        pBase *= (s.prodFontScale / 100); prBase *= (s.priceFontScale / 100);

        const pageDiv = document.createElement('div'); pageDiv.className = `a4-page layout-${pageLayout}`;
        
        pageItems.forEach((item) => {
            const prod = item.prod;
            const oIdx = item.originalIndex;

            if (!prod.nameTransform) prod.nameTransform = { x: 0, y: 0, scale: 1 }; 
            if (!prod.priceTransform) prod.priceTransform = { x: 0, y: 0, scale: 1 }; 
            if (!prod.priceRegularTransform) prod.priceRegularTransform = { x: 0, y: 0, scale: 1 };
            if (!prod.prefixTransform) prod.prefixTransform = { x: 0, y: 0, scale: 1 };
            
            const nameSize = pBase * prod.nameTransform.scale; 
            const priceSize = prBase * prod.priceTransform.scale; 
            const priceF = splitPrice(prod.price);
            
            let priceRegularHTML = ''; 
            let prefixHTML = '';
            
            if (s.promoType === 'club' || s.promoType === 'from_to') {
                const textTop = (s.promoType === 'club' ? s.textClubNormal : s.textPromoDe) || '';
                const textBottom = (s.promoType === 'club' ? s.textClubPromo : s.textPromoPor) || '';
                
                const prRegSize = (prBase * 0.40) * (s.priceRegularFontScale / 100) * prod.priceRegularTransform.scale;
                const prefixSize = (prBase * 0.40) * prod.prefixTransform.scale;
                
                priceRegularHTML = `
                    <div class="editable-element" data-index="${oIdx}" data-type="priceRegular" style="transform: translate(${prod.priceRegularTransform.x}px, ${prod.priceRegularTransform.y}px); font-size: ${prRegSize}rem; color: ${s.priceRegularColor}; text-align: center; width: 100%; font-weight: 900; line-height: 0.9; text-transform: uppercase;">
                        ${textTop.trim() !== '' ? `<div style="margin-bottom: 0px;">${sanitizeHTML(textTop)}</div>` : ''}
                        <div>R$ ${sanitizeHTML(prod.priceRegular)}</div>
                        <div class="element-resize-handle no-print"></div>
                    </div>
                `;
                
                let clubLogoEl = '';
                if (s.promoType === 'club' && state.clubLogoImg) {
                    const logoW = 100 * (s.clubLogoGlobalScale / 100);
                    clubLogoEl = `<img src="${state.clubLogoImg}" style="width: ${logoW}%; height: auto; object-fit: contain;">`;
                } else { 
                    clubLogoEl = textBottom.trim() !== '' ? `<div style="font-weight: 900; line-height: 0.9; text-transform: uppercase;">${sanitizeHTML(textBottom)}</div>` : ''; 
                }

                prefixHTML = clubLogoEl !== '' ? `
                    <div class="editable-element" data-index="${oIdx}" data-type="prefix" style="transform: translate(${prod.prefixTransform.x}px, ${prod.prefixTransform.y}px); font-size: ${prefixSize}rem; color: ${s.priceColor}; text-align: center; width: 100%; margin-top: 2px; margin-bottom: 0px; display: flex; justify-content: center; font-weight: 900;">
                        ${clubLogoEl}
                        <div class="element-resize-handle no-print"></div>
                    </div>
                ` : '';
            }

            pageDiv.innerHTML += `<div class="poster">${logoHTML}${headerHTML}
                <div class="poster-body" style="padding: 2%;">
                    
                    <div class="product-name editable-element" data-index="${oIdx}" data-type="name" style="transform: translate(${prod.nameTransform.x}px, ${prod.nameTransform.y}px); font-size: ${nameSize}rem; font-weight: 900; line-height: 0.9;">
                        ${sanitizeHTML(prod.name)}
                        <div class="element-resize-handle no-print"></div>
                    </div>
                    
                    ${priceRegularHTML}
                    ${prefixHTML}
                    
                    <div class="product-price editable-element" data-index="${oIdx}" data-type="price" style="transform: translate(${prod.priceTransform.x}px, ${prod.priceTransform.y}px); font-size: ${priceSize}rem; color: ${s.priceColor}; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <table style="border-collapse: collapse; margin: 0 auto; line-height: 0.8;">
                            <tr>
                                <td style="vertical-align: top; font-size: 0.4em; font-weight: 900; padding-top: 0.15em; padding-right: 2px;">R$</td>
                                <td style="vertical-align: top; font-weight: 900; letter-spacing: -0.02em;">${sanitizeHTML(priceF.intPart)}</td>
                                <td style="vertical-align: top; font-size: 0.5em; font-weight: 900; padding-top: 0.1em;">${sanitizeHTML(priceF.decPart)}</td>
                            </tr>
                        </table>
                        <div class="element-resize-handle no-print"></div>
                    </div>
                </div>${footerHTML}</div>`;
        });
        for (let j = 0; j < pageLayout - pageItems.length; j++) pageDiv.innerHTML += `<div class="poster flex items-center justify-center opacity-30"></div>`;
        els.previewContainer.appendChild(pageDiv);
    });
}

let isDraggingLogo = false, isResizingLogo = false, startMouseX, startMouseY, startLogoX, startLogoY, startLogoW, activePoster = null;
let isDraggingElement = false, isResizingElement = false, activeElIndex = -1, activeElType = null, activeDomElement = null, startElX, startElY, startElScale;

document.addEventListener('mousedown', (e) => {
    const elResizeHandle = e.target.closest('.element-resize-handle'); const editableEl = e.target.closest('.editable-element');
    if (elResizeHandle) { isResizingElement = true; activeDomElement = editableEl; activeElIndex = parseInt(editableEl.dataset.index); activeElType = editableEl.dataset.type; startMouseX = e.clientX; startElScale = state.products[activeElIndex][activeElType + 'Transform'].scale; e.preventDefault(); e.stopPropagation(); return; } 
    else if (editableEl) { isDraggingElement = true; activeDomElement = editableEl; activeElIndex = parseInt(editableEl.dataset.index); activeElType = editableEl.dataset.type; startMouseX = e.clientX; startMouseY = e.clientY; startElX = state.products[activeElIndex][activeElType + 'Transform'].x; startElY = state.products[activeElIndex][activeElType + 'Transform'].y; e.preventDefault(); return; }
    if (!state.logoImg) return;
    if (e.target.classList.contains('resize-handle')) { isResizingLogo = true; activePoster = e.target.closest('.poster'); startMouseX = e.clientX; startLogoW = state.settings.logoW; e.preventDefault(); } 
    else if (e.target.closest('.logo-container')) { isDraggingLogo = true; activePoster = e.target.closest('.poster'); startMouseX = e.clientX; startMouseY = e.clientY; startLogoX = state.settings.logoX; startLogoY = state.settings.logoY; e.preventDefault(); }
});

document.addEventListener('mousemove', (e) => {
    if (isDraggingElement && activeDomElement) {
        const newX = startElX + (e.clientX - startMouseX); const newY = startElY + (e.clientY - startMouseY);
        state.products[activeElIndex][activeElType + 'Transform'].x = newX; state.products[activeElIndex][activeElType + 'Transform'].y = newY;
        activeDomElement.style.transform = `translate(${newX}px, ${newY}px)`; return;
    }
    if (isResizingElement && activeDomElement) {
        let newScale = startElScale + ((e.clientX - startMouseX) / 100); if (newScale < 0.2) newScale = 0.2; if (newScale > 4.0) newScale = 4.0;
        state.products[activeElIndex][activeElType + 'Transform'].scale = newScale;
        const s = state.settings; 
        const pageLayout = state.products[activeElIndex].forcedLayout || s.layout; 
        
        let pBase, prBase;
        if (pageLayout === 1) { pBase = 4.0; prBase = 12.0; } else if (pageLayout === 2) { pBase = 3.0; prBase = 8.5; } else { pBase = 2.0; prBase = 5.5; }
        pBase *= (s.prodFontScale / 100); prBase *= (s.priceFontScale / 100);
        
        let baseSize;
        if (activeElType === 'name') baseSize = pBase;
        else if (activeElType === 'priceRegular') baseSize = prBase * 0.40 * (s.priceRegularFontScale / 100);
        else if (activeElType === 'prefix') baseSize = prBase * 0.40;
        else baseSize = prBase;
        
        activeDomElement.style.fontSize = `${baseSize * newScale}rem`; return;
    }
    if (!isDraggingLogo && !isResizingLogo) return;
    const posterRect = activePoster.getBoundingClientRect();
    if (isDraggingLogo) { const newX = startLogoX + (((e.clientX - startMouseX) / posterRect.width) * 100); const newY = startLogoY + (((e.clientY - startMouseY) / posterRect.height) * 100); state.settings.logoX = newX; state.settings.logoY = newY; document.documentElement.style.setProperty('--logo-x', `${newX}%`); document.documentElement.style.setProperty('--logo-y', `${newY}%`); }
    if (isResizingLogo) { let newW = startLogoW + (((e.clientX - startMouseX) / posterRect.width) * 100); if (newW < 5) newW = 100; if (newW > 100) newW = 100; state.settings.logoW = newW; document.documentElement.style.setProperty('--logo-w', `${newW}%`); }
});

document.addEventListener('mouseup', () => { isDraggingLogo = false; isResizingLogo = false; activePoster = null; isDraggingElement = false; isResizingElement = false; activeDomElement = null; });

els.addManualBtn.addEventListener('click', () => {
    const name = els.manualProdName.value.trim(), price = els.manualProdPrice.value.trim(), priceReg = els.manualProdPriceRegular.value.trim();
    if (!name || !price) return showToast("Preencha nome e preço principal.", "error");
    state.products.push({ name: name.toUpperCase(), price: formatPrice(price), priceRegular: formatPrice(priceReg), forcedLayout: null, nameTransform: { x: 0, y: 0, scale: 1 }, priceTransform: { x: 0, y: 0, scale: 1 }, priceRegularTransform: { x: 0, y: 0, scale: 1 }, prefixTransform: { x: 0, y: 0, scale: 1 } });
    els.manualProdName.value = ''; els.manualProdPrice.value = ''; els.manualProdPriceRegular.value = ''; els.manualProdName.focus(); renderPosters(); showToast("Inserido!", "success");
});

els.clearLogoBtn.addEventListener('click', () => { state.logoImg = null; els.logoUpload.value = ''; els.clearLogoBtn.classList.add('hidden'); renderPosters(); });
els.clearClubLogoBtn.addEventListener('click', () => { state.clubLogoImg = null; els.clubLogoUpload.value = ''; els.clearClubLogoBtn.classList.add('hidden'); renderPosters(); });
els.clearHeaderBtn.addEventListener('click', () => { state.headerImg = null; els.headerUpload.value = ''; els.clearHeaderBtn.classList.add('hidden'); renderPosters(); });
els.clearFooterBtn.addEventListener('click', () => { state.footerImg = null; els.footerUpload.value = ''; els.clearFooterBtn.classList.add('hidden'); renderPosters(); });

els.headerUpload.addEventListener('change', (e) => handleImageUpload(e, 'headerImg')); els.footerUpload.addEventListener('change', (e) => handleImageUpload(e, 'footerImg')); els.logoUpload.addEventListener('change', (e) => handleImageUpload(e, 'logoImg')); els.clubLogoUpload.addEventListener('change', (e) => handleImageUpload(e, 'clubLogoImg')); els.excelUpload.addEventListener('change', handleExcelUpload);
els.posterBgColor.addEventListener('input', (e) => { state.settings.posterBgColor = e.target.value; renderPosters(); });
els.autoHeaderBg.addEventListener('input', (e) => { state.settings.autoThemeHeaderBg = e.target.value; renderPosters(); }); els.autoTextColor.addEventListener('input', (e) => { state.settings.autoThemeTextColor = e.target.value; renderPosters(); }); els.autoFooterBg.addEventListener('input', (e) => { state.settings.autoThemeFooterBg = e.target.value; renderPosters(); });
els.autoThemeText.addEventListener('input', (e) => { state.settings.autoThemeText = e.target.value.toUpperCase(); renderPosters(); }); els.autoThemeSecondaryText.addEventListener('input', (e) => { state.settings.autoThemeSecondaryText = e.target.value.toUpperCase(); renderPosters(); });
els.presetBtns.forEach(btn => { btn.addEventListener('click', (e) => { const bg = e.target.dataset.bg, text = e.target.dataset.text, foot = e.target.dataset.foot; state.settings.autoThemeHeaderBg = bg; state.settings.autoThemeTextColor = text; state.settings.autoThemeFooterBg = foot; els.autoHeaderBg.value = bg; els.autoTextColor.value = text; els.autoFooterBg.value = foot; renderPosters(); }); });

els.fontFamily.addEventListener('change', (e) => { state.settings.fontFamily = e.target.value; renderPosters(); });
els.prodColor.addEventListener('input', (e) => { state.settings.prodColor = e.target.value; renderPosters(); }); els.priceColor.addEventListener('input', (e) => { state.settings.priceColor = e.target.value; renderPosters(); }); els.priceRegularColor.addEventListener('input', (e) => { state.settings.priceRegularColor = e.target.value; renderPosters(); });
els.prodFontSizeScale.addEventListener('input', (e) => { state.settings.prodFontScale = parseInt(e.target.value); els.prodFontSizeDisplay.textContent = `${state.settings.prodFontScale}%`; renderPosters(); }); els.priceFontSizeScale.addEventListener('input', (e) => { state.settings.priceFontScale = parseInt(e.target.value); els.priceFontSizeDisplay.textContent = `${state.settings.priceFontScale}%`; renderPosters(); }); els.priceRegularFontSizeScale.addEventListener('input', (e) => { state.settings.priceRegularFontScale = parseInt(e.target.value); els.priceRegularSizeDisplay.textContent = `${state.settings.priceRegularFontScale}%`; renderPosters(); });
els.autoTitleScale.addEventListener('input', (e) => { state.settings.autoTitleScale = parseInt(e.target.value); els.autoTitleSizeDisplay.textContent = `${state.settings.autoTitleScale}%`; renderPosters(); }); els.autoSubScale.addEventListener('input', (e) => { state.settings.autoSubScale = parseInt(e.target.value); els.autoSubSizeDisplay.textContent = `${state.settings.autoSubScale}%`; renderPosters(); });
els.clubLogoGlobalScale.addEventListener('input', (e) => { state.settings.clubLogoGlobalScale = parseInt(e.target.value); els.clubLogoSizeDisplay.textContent = `${state.settings.clubLogoGlobalScale}%`; renderPosters(); });

els.textPromoDe.addEventListener('input', (e) => { state.settings.textPromoDe = e.target.value.toUpperCase(); renderPosters(); }); els.textPromoPor.addEventListener('input', (e) => { state.settings.textPromoPor = e.target.value.toUpperCase(); renderPosters(); });
els.textClubNormal.addEventListener('input', (e) => { state.settings.textClubNormal = e.target.value.toUpperCase(); renderPosters(); }); 
els.textClubPromo.addEventListener('input', (e) => { state.settings.textClubPromo = e.target.value.toUpperCase(); renderPosters(); });

els.layoutBtns.forEach(btn => { btn.addEventListener('click', (e) => { els.layoutBtns.forEach(b => { b.classList.remove('border-blue-600', 'bg-blue-50', 'text-blue-700', 'border-2'); b.classList.add('border-gray-300', 'bg-white', 'text-gray-600', 'border'); }); e.currentTarget.classList.remove('border-gray-300', 'bg-white', 'text-gray-600', 'border'); e.currentTarget.classList.add('border-blue-600', 'bg-blue-50', 'text-blue-700', 'border-2'); state.settings.layout = parseInt(e.currentTarget.dataset.layout); renderPosters(); }); });

els.saveProjectBtn.addEventListener('click', saveCurrentProject);
els.printBtn.addEventListener('click', () => { if(state.products.length === 0) return showToast("Adicione produtos antes de imprimir!", "error"); window.print(); });

window.addEventListener('DOMContentLoaded', () => { updatePromoUI(); renderPosters(); });
