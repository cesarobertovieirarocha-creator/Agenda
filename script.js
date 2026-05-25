console.log('Script Eisenhower v2.0 carregando...');
window.onerror = function (msg, url, line, col, error) {
    console.error('ERRO GLOBAL CAPTURADO:', msg, 'em', url, 'linha:', line);
    return false;
};

const users = {
    sigma: {
        'rerisson.moura': { pass: 'Rerisson@2026!', avatar: 'Imagens/Rerisson.jpg' },
        'isabela.rodrigues': { pass: 'Isabela@456!', avatar: 'Imagens/Isabela.jpg' },
        'cesar.roberto': { pass: 'Cesar@789!', avatar: 'Imagens/Cesar.jpg' }
    },
    mondelez: {
        'maria.eduarda': { pass: 'Maria@Edu123!', avatar: 'Imagens/Maria Eduarda.jpg' },
        'gabriel.moura': { pass: 'Gabriel@456!', avatar: 'Imagens/Gabriel .jpg' },
        'rerisson.moura': { pass: 'Rerisson@2026!', avatar: 'Imagens/Rerisson.jpg' }
    }
};

const allowedAdmins = ['rerisson.moura'];

const eisenhower = {
    'do': 'matrix-do',
    'schedule': 'matrix-schedule',
    'delegate': 'matrix-delegate',
    'eliminate': 'matrix-eliminate'
};

const brandNames = {
    'brand-nivea': 'Nivea',
    'brand-rayovac': 'Rayovac',
    'brand-reckitt': 'Reckitt',
    'brand-vestacy': 'Vestacy',
    'brand-kimberly': 'Kimberly-Clark',
    'brand-diageo': 'Diageo',
    'brand-vct': 'VCT',
    'brand-bic': 'BIC',
    'brand-cargill': 'Cargill',
    'brand-haleon': 'Haleon',
    'brand-mondelez': 'Mondelez',
    'brand-hypera': 'Hypera',
    'brand-Operacional': 'Operacional'
};

// --- EDITE OS LINKS DAS IMAGENS AQUI ---
const brandLogos = {
    'brand-nivea': 'Imagens/Nivea.png',
    'brand-rayovac': 'Imagens/Rayovac.png',
    'brand-reckitt': 'Imagens/Reckitt.png',
    'brand-vestacy': 'Imagens/Vestacy.png',
    'brand-kimberly': 'Imagens/kimberly.png',
    'brand-diageo': 'Imagens/Diageo.png',
    'brand-vct': 'Imagens/VCT.png',
    'brand-bic': 'Imagens/BIC.png',
    'brand-cargill': 'Imagens/Cargil.png',
    'brand-haleon': 'Imagens/Haleon.png',
    'brand-mondelez': 'Imagens/Mondelez.png',
    'brand-hypera': 'Imagens/Hypera.png',
    'brand-Operacional': 'Imagens/Operacional.png'
};

let currentDate = new Date();
let selectedDate = new Date();
let currentUserDivision = ''; // Armazena a divisão do usuário logado
let currentUserRole = '';     // Armazena o perfil (VIEWER, USER, ADMIN)
let currentUsername = '';     // Armazena o username logado

// Gerador de IDs únicos de alta entropia (suporta UUID nativo)
function generateUUID(prefix = '') {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return prefix + crypto.randomUUID();
    }
    return prefix + Date.now() + Math.random().toString(36).substr(2, 9);
}

/**
 * @typedef {Object} Event
 * @property {string} id
 * @property {string} title
 * @property {number} day
 * @property {string} industry
 * @property {string} matrix ('do', 'schedule', 'delegate', 'eliminate')
 * @property {string} visibility ('public', 'private')
 * @property {string} createdBy
 * @property {string} assignedTo
 * @property {string} division
 * @property {boolean} completed
 * @property {string} time 
 * @property {string} endTime 
 * @property {string} description 
 * @property {string} createdAt (ISO Date)
 * @property {string} updatedAt (ISO Date)
 * @property {string} status ('active', 'archived', 'deleted')
 */

// --- MÓDULO DE PERMISSÕES (ACL) ---
const Permissions = {
    roles: {
        ADMIN: ['create', 'edit', 'delete', 'complete', 'export', 'drag', 'change_visibility', 'change_assignee'],
        USER: ['create', 'edit', 'complete', 'export', 'drag', 'change_visibility', 'change_assignee'],
        VIEWER: []
    },
    can: (action, role, user, event = null) => {
        if (role === 'ADMIN') return true;
        if (role === 'VIEWER') return false; // VIEWER: sem ações
        if (action === 'export' && role !== 'USER') return false;

        const roleActions = Permissions.roles[role] || [];
        if (!roleActions.includes(action)) return false;

        if (role === 'USER') {
            if (action === 'create' || action === 'export') return true;
            if (!event) return false;

            const isOwner = event.createdBy === user;
            const isAssigned = event.assignedTo === user;

            // Bloqueio rígido: ngm além do admin mexe em arquivo morto
            if (event.status === 'archived' && action !== 'export') return false;

            // Editar: próprias e atribuídas a ele
            if (action === 'edit') return isOwner || isAssigned;
            // Excluir: apenas próprias
            if (action === 'delete') return isOwner;
            // Drag: owner e assignee
            if (action === 'drag') return isOwner || isAssigned;
            // Concluir: próprias e atribuídas
            if (action === 'complete') return isOwner || isAssigned;

            // Campos sensíveis
            if (action === 'change_visibility' || action === 'change_assignee') return isOwner;
        }
        return false;
    }
};

// --- ENTIDADES DE DOMÍNIO (Domain Entities) ---
const Domain = {
    createEvent: (data) => {
        const id = data.id || generateUUID('evt_');
        return {
            id,
            title: String(data.title || 'Nova Tarefa'),
            day: Number(data.day || 1),
            industry: String(data.industry || 'brand-Operacional'),
            matrix: String(data.matrix || 'do'),
            visibility: String(data.visibility || 'public'),
            division: String(data.division || currentUserDivision || 'sigma'),
            status: String(data.status || 'active'),
            version: Number(data.version || 1),
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            completed: !!data.completed,
            assignedTo: String(data.assignedTo || ''),
            createdBy: String(data.createdBy || currentUsername || 'system'),
            description: String(data.description || ''),
            time: data.time || '',
            endTime: data.endTime || '',
            // Preservar dados de recorrência
            seriesId: data.seriesId || null,
            recurrenceType: data.recurrenceType || null,
            recurrenceEnd: data.recurrenceEnd || null,
            // Preservar dados de anexos
            attachment: data.attachment || null,
            attachmentName: data.attachmentName || null,
            // Preservar dados de lembretes
            reminder: !!data.reminder,
            reminderTime: data.reminderTime || ''
        };
    },
    validateRelationship: (event, allUsers) => {
        // Enforça que o responsável pertença à mesma divisão
        if (event.assignedTo && event.assignedTo !== 'all') {
            // Aqui poderíamos validar contra a lista de usuários real
        }
        return true;
    }
};

// --- CONFIGURAÇÃO DE ERROS ---
const ErrorMessages = {
    PERMISSION: {
        CREATE: "Você não tem permissão para criar tarefas.",
        EDIT_OWN: "Você só pode editar tarefas criadas por você.",
        DELETE_OWN: "Você só pode excluir tarefas criadas por você.",
        DRAG: "Você não tem permissão para mover esta tarefa.",
        VIEWER_BLOCKED: "Seu perfil de visualização não permite esta ação.",
        EXPORT: "Você não tem permissão para exportar dados."
    },
    DATA: {
        INVALID_EVENT: "Dados corrompidos detectados e ignorados.",
        VERSION_CONFLICT: "A tarefa foi atualizada por outro processo. Recarregue a página.",
        LOAD_ERROR: "Erro ao carregar dados do armazenamento."
    }
};

// --- GATEKEEPER DE INTEGRIDADE ---
function validateEvent(event) {
    if (!event || typeof event !== 'object') {
        console.warn("INVALID_EVENT_DISCARDED: Not an object", event);
        return null;
    }

    // Validação de Tipos Rígida
    const schema = {
        id: 'string',
        title: 'string',
        day: 'number',
        industry: 'string',
        matrix: 'string',
        visibility: 'string',
        division: 'string',
        status: 'string'
    };

    for (const [key, type] of Object.entries(schema)) {
        if (typeof event[key] !== type) {
            console.warn(`INVALID_EVENT_DISCARDED: Key "${key}" should be ${type}`, event);
            return null;
        }
    }

    // Validação de Valores Permitidos
    if (!['public', 'private'].includes(event.visibility)) return null;
    if (!['active', 'archived', 'deleted'].includes(event.status)) return null;

    // Normalização e Fallbacks
    return {
        ...event,
        version: typeof event.version === 'number' ? event.version : 1,
        createdAt: event.createdAt || new Date().toISOString(),
        updatedAt: event.updatedAt || new Date().toISOString(),
        completed: !!event.completed,
        assignedTo: event.assignedTo || '',
        createdBy: event.createdBy || 'unknown'
    };
}

// --- PERSISTENCE PROVIDER (Abstração Async) ---
const PersistenceProvider = {
    saveEvents: async (data) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    localStorage.setItem('eisenhowerEvents', JSON.stringify(data));
                    resolve(true);
                } catch (e) {
                    reject(new Error("DATA.SAVE_ERROR"));
                }
            }, 400); // Simula latência de rede/disco
        });
    },
    loadEvents: () => {
        try {
            return JSON.parse(localStorage.getItem('eisenhowerEvents')) || {};
        } catch (e) {
            console.error("Erro crítico ao ler eventos:", e);
            return {};
        }
    },
    saveAuditLogs: (logs) => localStorage.setItem('eisenhowerAuditLogs', JSON.stringify(logs.slice(-1000))),
    loadAuditLogs: () => JSON.parse(localStorage.getItem('eisenhowerAuditLogs')) || []
};


// --- APP STORE (Fonte Única de Verdade) ---
const AppStore = {
    state: {
        eventsData: {},
        user: {
            username: '',
            role: '',
            division: ''
        },
        viewingUser: 'all',
        lastHash: null,
        processedCache: null
    },

    // Getters Imutáveis (Proteção contra leitura mutável)
    getEvents: () => {
        try {
            return structuredClone(AppStore.state.eventsData);
        } catch (e) {
            // Fallback para navegadores antigos ou objetos não clonáveis
            return JSON.parse(JSON.stringify(AppStore.state.eventsData));
        }
    },
    getCurrentUser: () => ({ ...AppStore.state.user }),

    // Mutadores Controlados
    setEvents: (newData) => {
        const validatedData = {};
        Object.keys(newData).forEach(key => {
            validatedData[key] = (newData[key] || []).map(Domain.createEvent).filter(Boolean);
        });
        AppStore.state.eventsData = validatedData;
        AppStore.persist();
    },

    addEvent: async (monthKey, event) => {
        if (!Permissions.can('create', currentUserRole, currentUsername)) return false;

        // SEGURANÇA: Isolar divisão no backend fake (ignora input)
        const safeDivision = currentUserRole === 'ADMIN' ? (event.division || currentUserDivision) : currentUserDivision;

        const validated = Domain.createEvent({
            ...event,
            division: safeDivision,
            status: 'active',
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        if (!validated) return false;

        if (!AppStore.state.eventsData[monthKey]) AppStore.state.eventsData[monthKey] = [];
        AppStore.state.eventsData[monthKey].push(validated);
        await AppStore.persist();
        logAudit('CREATE_EVENT', validated.id, validated.title, validated.industry, validated.matrix);

        // Se for recorrente, processa para criar as 3 ativas
        if (validated.seriesId) {
            processRecurrences();
        }
        return true;
    },


    updateEvent: async (monthKey, eventId, newData) => {
        const monthEvents = AppStore.state.eventsData[monthKey] || [];
        const idx = monthEvents.findIndex(e => e.id === eventId);
        if (idx === -1) return false;

        const existing = monthEvents[idx];

        // --- VALIDAÇÕES DE SEGURANÇA (ANTI-BYPASS) ---
        // 1. Trava de estado
        if (existing.status === 'archived' && currentUserRole !== 'ADMIN') {
            console.warn("BLOCKED: Tentativa de editar tarefa arquivada.");
            return false;
        }

        const isJustCompleting = Object.keys(newData).length === 1 && newData.hasOwnProperty('completed');
        const isJustDragging = (newData.hasOwnProperty('day') || newData.hasOwnProperty('monthKey')) && !newData.hasOwnProperty('title');

        if (existing.status === 'completed' && currentUserRole !== 'ADMIN' && !isJustCompleting) {
            console.warn("BLOCKED: Tarefa concluída não pode ter campos críticos editados por USER.");
            return false;
        }

        // 2. Permissão de ação base
        if (isJustCompleting) {
            if (!Permissions.can('complete', currentUserRole, currentUsername, existing)) return false;
        } else if (isJustDragging) {
            if (!Permissions.can('drag', currentUserRole, currentUsername, existing)) return false;
        } else {
            if (!Permissions.can('edit', currentUserRole, currentUsername, existing)) return false;
        }

        // 3. Blindagem de campos sensíveis
        if (newData.hasOwnProperty('visibility') && newData.visibility !== existing.visibility) {
            if (!Permissions.can('change_visibility', currentUserRole, currentUsername, existing)) {
                newData.visibility = existing.visibility; // Anula a alteração maliciosa
            }
        }
        if (newData.hasOwnProperty('assignedTo') && newData.assignedTo !== existing.assignedTo) {
            if (!Permissions.can('change_assignee', currentUserRole, currentUsername, existing)) {
                newData.assignedTo = existing.assignedTo; // Anula a alteração maliciosa
            }
        }
        if (newData.hasOwnProperty('division') && currentUserRole !== 'ADMIN') {
            newData.division = existing.division; // USER nunca altera divisão
        }
        if (newData.hasOwnProperty('createdBy')) {
            newData.createdBy = existing.createdBy; // Nunca altera owner originário
        }

        // Controle de Concorrência (Version Conflict)
        if (newData.version && newData.version < existing.version) {
            console.error("DATA.VERSION_CONFLICT", { existing: existing.version, incoming: newData.version });

            // Estratégia de Resolução: Perguntar ao usuário
            const confirmReload = confirm("Esta tarefa foi alterada por outro processo. Deseja recarregar os dados para evitar perda de informações?");
            if (confirmReload) {
                initializeData(); // Recarrega tudo do storage
                generateCalendar(currentDate);
                return false;
            }
            // Se não recarregar, bloqueia o update para evitar overwrite cego
            throw new Error("DATA.VERSION_CONFLICT");
        }

        const updated = Domain.createEvent({
            ...existing,
            ...newData,
            version: existing.version + 1,
            updatedAt: new Date().toISOString()
        });

        if (!updated) return false;
        AppStore.state.eventsData[monthKey][idx] = updated;
        await AppStore.persist();

        // Log específico
        if (isJustCompleting) logAudit('COMPLETE_EVENT', updated.id, updated.title, updated.industry, updated.matrix);
        else if (isJustDragging) logAudit('MOVE_EVENT', updated.id, updated.title, updated.industry, updated.matrix);
        else logAudit('UPDATE_EVENT', updated.id, updated.title, updated.industry, updated.matrix);

        return true;
    },

    deleteEvent: (monthKey, eventId) => {
        const monthEvents = AppStore.state.eventsData[monthKey] || [];
        const idx = monthEvents.findIndex(e => e.id === eventId);
        if (idx === -1) return false;

        const existing = monthEvents[idx];
        if (!existing || !Permissions.can('delete', currentUserRole, currentUsername, existing)) return false;

        AppStore.state.eventsData[monthKey][idx] = {
            ...existing,
            status: 'deleted',
            version: existing.version + 1,
            updatedAt: new Date().toISOString()
        };
        AppStore.persist();
        logAudit('DELETE_EVENT', existing.id, existing.title, existing.industry, existing.matrix);

        if (existing.seriesId) processRecurrences();
        return true;
    },

    archiveEvent: (monthKey, eventId) => {
        const monthEvents = AppStore.state.eventsData[monthKey] || [];
        const event = monthEvents.find(e => e.id === eventId);
        const success = AppStore.updateEvent(monthKey, eventId, { status: 'archived' });
        if (success && event && event.seriesId) {
            processRecurrences();
        }
        return success;
    },

    deleteEntireSeries: async (seriesId) => {
        if (!seriesId) return 0;
        let deletedCount = 0;
        const allEvents = AppStore.state.eventsData;
        Object.keys(allEvents).forEach(monthKey => {
            allEvents[monthKey] = allEvents[monthKey].map(event => {
                if (event.seriesId === seriesId && event.status !== 'deleted') {
                    const allowed = (currentUserRole === 'ADMIN' || (currentUserRole === 'USER' && event.createdBy === currentUsername));
                    if (allowed) {
                        deletedCount++;
                        return {
                            ...event,
                            status: 'deleted',
                            version: event.version + 1,
                            updatedAt: new Date().toISOString()
                        };
                    }
                }
                return event;
            });
        });
        if (deletedCount > 0) {
            await AppStore.persist();
        }
        return deletedCount;
    },

    saveTimeout: null,
    persist: async () => {
        if (AppStore.saveTimeout) clearTimeout(AppStore.saveTimeout);
        return new Promise((resolve) => {
            AppStore.saveTimeout = setTimeout(async () => {
                try {
                    const syncBtn = document.getElementById('syncBtn');
                    if (syncBtn) syncBtn.classList.add('is-syncing');

                    await PersistenceProvider.saveEvents(AppStore.state.eventsData);

                    if (syncBtn) syncBtn.classList.remove('is-syncing');
                    AppStore.state.lastHash = null;
                    resolve(true);
                } catch (err) {
                    console.error("Erro na persistência:", err);
                    showToast("Falha ao salvar dados no armazenamento local.", "error");
                    resolve(false);
                }
            }, 300);
        });
    }
};



// --- PIPELINE EM CAMADAS (Projeção) ---
const EventPipeline = {
    validateLayer: (events) => events.map(validateEvent).filter(Boolean),
    statusLayer: (events) => events.filter(e => e.status === 'active'),
    visibilityLayer: (events, user, role, division) => events.filter(event => {
        if (role === 'ADMIN') return true;
        // VIEWER: só tarefas públicas da mesma divisão
        if (role === 'VIEWER') return event.visibility === 'public';
        // USER: próprias + atribuídas + públicas da mesma divisão
        if (event.createdBy === user || event.assignedTo === user) return true;
        if (event.visibility === 'public') return true;
        return false;
    }),
    permissionLayer: (events, user, role) => events.map(event => ({
        ...event,
        permissions: {
            canEdit: Permissions.can('edit', role, user, event),
            canDelete: Permissions.can('delete', role, user, event),
            canDrag: Permissions.can('drag', role, user, event),
            canComplete: Permissions.can('complete', role, user, event)
        }
    })),
    sortLayer: (events) => events.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),

    generateHash: (events) => JSON.stringify(
        events.map(e => `${e.id}:${e.version}:${e.status}:${e.visibility}:${e.assignedTo}:${e.title}:${e.day}:${e.matrix}`).sort()
    ),


    process: (monthKey, user, role) => {
        const rawEvents = AppStore.state.eventsData[monthKey] || [];
        const currentHash = EventPipeline.generateHash(rawEvents);

        if (AppStore.state.lastHash === currentHash && AppStore.state.processedCache) {
            return AppStore.state.processedCache;
        }

        let events = EventPipeline.validateLayer(rawEvents);
        events = EventPipeline.statusLayer(events);
        events = EventPipeline.visibilityLayer(events, user, role);
        // Isola divisão (todos os roles exceto ADMIN global)
        const division = AppStore.state.user.division;
        if (role !== 'ADMIN' || !allowedAdmins.includes(user)) {
            events = events.filter(e => !e.division || e.division === division);
        }
        events = EventPipeline.permissionLayer(events, user, role);
        events = EventPipeline.sortLayer(events);

        AppStore.state.lastHash = currentHash;
        AppStore.state.processedCache = events;

        return events;
    }
};

// --- SISTEMA DE AUDITORIA (LOGS) ---
function addAuditLog(action, taskId, taskTitle, industry, matrix) {
    const logs = PersistenceProvider.loadAuditLogs();
    const newLog = {
        user: currentUsername,
        division: currentUserDivision,
        date: new Date().toLocaleString('pt-BR'),
        action: action,
        taskId: taskId,
        title: taskTitle,
        industry: industry || '',
        matrix: matrix || ''
    };
    logs.push(newLog);
    PersistenceProvider.saveAuditLogs(logs);
}

function logAudit(action, taskId, taskTitle, industry, matrix) {
    addAuditLog(action, taskId, taskTitle, industry, matrix);
}


// Funções canEdit/canDelete legadas removidas em favor da ACL Permissions.can

let viewingUser = 'all';      // Usuário que estamos visualizando no momento

// Dados de exemplo iniciais se o localStorage estiver vazio
const defaultEvents = {
    "2026-04": [
        { id: '1', day: 5, industry: 'brand-nivea', matrix: 'do', title: 'Campanha Nivea' },
        { id: '2', day: 12, industry: 'brand-cargill', matrix: 'schedule', title: 'Planejamento Cargill' },
        { id: '3', day: 18, industry: 'brand-reckitt', matrix: 'delegate', title: 'Distribuição Reckitt' }
    ]
};

// --- INICIALIZAÇÃO DE DADOS ---
function initializeData() {
    const rawData = PersistenceProvider.loadEvents();

    // Se estiver vazio, carrega defaults
    if (Object.keys(rawData).length === 0) {
        AppStore.setEvents(defaultEvents);
        return;
    }

    // Migração e Sanitização
    const migratedData = {};
    Object.keys(rawData).forEach(key => {
        let newKey = key;
        // Migra chaves numéricas antigas (ex: "04" -> "2026-04")
        if (!key.includes('-') && !isNaN(key)) {
            newKey = `${new Date().getFullYear()}-${key.padStart(2, '0')}`;
        }

        migratedData[newKey] = (rawData[key] || []).map(event => {
            const validated = validateEvent(event);
            if (validated) {
                // Fix para divisão ausente em dados legados
                if (!validated.division) validated.division = 'sigma';
            }
            return validated;
        }).filter(Boolean);
    });

    AppStore.setEvents(migratedData);
}

// Inicializa a Store com os dados sanitizados
try {
    initializeData();
} catch (e) {
    console.error("Falha na inicialização de dados:", e);
}


const daysOfWeek = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

function generateCalendar(date) {
    const calendar = document.getElementById('calendar');
    if (!calendar) return;
    calendar.innerHTML = '';

    // 1. CAMADA DE DADOS (Pipeline Centralizado)
    const yearKey = date.getFullYear();
    const monthKey = String(date.getMonth() + 1).padStart(2, '0');
    const fullKey = `${yearKey}-${monthKey}`;

    // Processamento com Pipeline (Validação -> Filtro -> Permissão -> Sort)
    let filteredEvents = EventPipeline.process(fullKey, currentUsername, currentUserRole);

    // Filtros de UI Adicionais (Indústria, Matriz, Busca, Status)
    const filterIndustry = document.getElementById('filterIndustry')?.value || 'all';
    const filterMatrix = document.getElementById('filterMatrix')?.value || 'all';
    const filterStatus = document.getElementById('filterStatus')?.value || 'all';

    filteredEvents = filteredEvents.filter(event => {
        // Filtro de usuário (Admin e Viewer)
        if (viewingUser && viewingUser !== 'all') {
            const matchesViewingUser = event.createdBy === viewingUser || event.assignedTo === viewingUser;
            if (!matchesViewingUser) return false;
        }

        const matchesIndustry = filterIndustry === 'all' || event.industry === filterIndustry;
        const matchesMatrix = filterMatrix === 'all' || event.matrix === filterMatrix;
        const matchesSearch = !searchQuery || event.title.toLowerCase().includes(searchQuery);

        let matchesStatus = true;
        if (filterStatus === 'pending') matchesStatus = !event.completed;
        else if (filterStatus === 'completed') matchesStatus = event.completed;
        else if (filterStatus === 'archived') matchesStatus = event.status === 'archived';

        return matchesIndustry && matchesMatrix && matchesSearch && matchesStatus;
    });


    // Headers dos dias da semana
    daysOfWeek.forEach(day => {
        const header = document.createElement('div');
        header.className = 'm-day-header';
        header.textContent = day;
        calendar.appendChild(header);
    });

    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    for (let i = 0; i < 42; i++) {
        const cell = document.createElement('div');
        cell.className = 'm-day-cell';


        const cellDate = new Date(startDate);
        cellDate.setDate(startDate.getDate() + i);

        const dayNumber = cellDate.getDate();
        const isCurrentMonth = cellDate.getMonth() === date.getMonth();
        const isToday = cellDate.toDateString() === new Date().toDateString();

        const dayNumSpan = document.createElement('span');
        dayNumSpan.className = 'day-number';
        dayNumSpan.textContent = dayNumber;
        cell.appendChild(dayNumSpan);

        if (!isCurrentMonth) cell.style.opacity = '0.35';
        if (isToday) cell.classList.add('today');

        // Botão "+" (Apenas se tiver permissão de 'create')
        if (isCurrentMonth && Permissions.can('create', currentUserRole, currentUsername)) {
            const addBtn = document.createElement('div');
            addBtn.className = 'add-event-btn';
            addBtn.innerHTML = '+';
            addBtn.title = 'Criar nova tarefa';
            addBtn.onclick = (e) => {
                e.stopPropagation();
                openModal(dayNumber, cellDate.getMonth(), cellDate.getFullYear());
            };
            cell.appendChild(addBtn);
        }

        if (isCurrentMonth) {
            const dayEvents = filteredEvents.filter(e => e.day === dayNumber);

            if (dayEvents.length > 0) {
                dayEvents.slice(0, 3).forEach((event) => {
                    const eventDiv = document.createElement('div');
                    eventDiv.className = 'm-event-item';


                    // Estados Visuais (Classes)
                    if (event.completed) eventDiv.classList.add('is-completed');
                    if (event.visibility === 'private') eventDiv.classList.add('is-private');

                    // Se não puder editar, adiciona classe read-only para UX
                    if (!Permissions.can('edit', currentUserRole, currentUsername, event)) {
                        eventDiv.classList.add('is-readonly');
                    }

                    const industryKey = event.industry || 'brand-Operacional';
                    const logoSrc = brandLogos[industryKey] || `Imagens/${industryKey.replace('brand-', '')}.png`;
                    const endTimeDisplay = event.endTime ? ` às ${event.endTime}` : '';
                    const timeDisplay = event.time ? `<span class="u-text-muted">${event.time}${endTimeDisplay}</span> ` : '';

                    eventDiv.innerHTML = `
                        <img src="${logoSrc}" class="mini-logo" onerror="this.style.opacity='0'" alt="">
                        <div class="mini-title" title="${event.title}">
                            <span>${timeDisplay}${event.title}</span>
                            ${event.assignedTo ? `<small>👤 ${getUserDisplayName(event.assignedTo)}</small>` : ''}
                        </div>
                    `;
                    eventDiv.style.backgroundColor = getMatrixColor(event.matrix);

                    eventDiv.onclick = (e) => {
                        e.stopPropagation();
                        openEventDetail(event, fullKey);
                    };

                    setupDragDrop(eventDiv, event, fullKey);
                    cell.appendChild(eventDiv);
                });

                if (dayEvents.length > 3) {
                    const moreEvents = document.createElement('div');
                    moreEvents.className = 'no-events';
                    moreEvents.textContent = `+ ${dayEvents.length - 3} tarefas`;
                    cell.appendChild(moreEvents);
                }
            }
        }

        cell.addEventListener('click', () => {
            if (isCurrentMonth) openDayDetails(dayNumber, cellDate.getMonth(), cellDate.getFullYear());
        });

        setupCellDrop(cell, dayNumber, isCurrentMonth);
        calendar.appendChild(cell);
    }

    // Atualizar header e contadores
    const formattedDate = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const monthDisplay = document.getElementById('currentMonthDisplay');
    if (monthDisplay) monthDisplay.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

    const monthFilter = document.getElementById('monthFilter');
    if (monthFilter) monthFilter.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (typeof updatePriorityCounters === 'function') updatePriorityCounters();
}


// --- HELPERS DE PERMISSÃO ---
function canEdit(event) {
    return Permissions.can('edit', currentUserRole, currentUsername, event);
}
function canArchive(event) {
    return Permissions.can('delete', currentUserRole, currentUsername, event) ||
        (currentUserRole === 'USER' && (event.createdBy === currentUsername || event.assignedTo === currentUsername));
}

function applyFilters() {
    generateCalendar(currentDate);
    syncLegendState();
}

function syncLegendState() {
    const filterSelect = document.getElementById('filterMatrix');
    if (!filterSelect) return;

    const matrix = filterSelect.value;
    document.querySelectorAll('.legend-item').forEach(item => {
        item.classList.remove('active-filter');
    });

    if (matrix !== 'all') {
        const priorities = ['do', 'schedule', 'delegate', 'eliminate'];
        const index = priorities.indexOf(matrix);
        if (index > -1) {
            document.querySelectorAll('.legend-item')[index].classList.add('active-filter');
        }
    }
}

function togglePriorityFilter(matrix) {
    const filterSelect = document.getElementById('filterMatrix');
    if (!filterSelect) return;

    if (filterSelect.value === matrix) {
        filterSelect.value = 'all';
    } else {
        filterSelect.value = matrix;
    }
    applyFilters();
}

// Lógica do Modal de Evento
function openModal(day, month, year) {
    document.getElementById('eventModal').style.display = 'flex';
    const yearVal = year || currentDate.getFullYear();
    const monthVal = String(month + 1).padStart(2, '0');
    document.getElementById('eventDate').value = `${yearVal}-${monthVal}-${day}`;
    document.getElementById('eventTitle').value = '';
    document.getElementById('eventTime').value = '';
    const eventEndTimeInput = document.getElementById('eventEndTime');
    if (eventEndTimeInput) eventEndTimeInput.value = '';
    document.getElementById('eventVisibility').value = 'public';

    // Atualiza as opções de indústria com base na divisão
    updateIndustryOptions();
    populateAssignedToSelect();

    if (currentUserRole === 'ADMIN' && viewingUser !== 'all') {
        const assignedSelect = document.getElementById('eventAssignedTo');
        if (assignedSelect) {
            assignedSelect.value = viewingUser;
        }
    }

    document.getElementById('eventTitle').focus();
}

function updateIndustryOptions() {
    const select = document.getElementById('eventIndustry');
    if (!select) return;

    select.innerHTML = '';

    if (currentUserDivision === 'mondelez' && !allowedAdmins.includes(currentUsername)) {
        // Apenas Mondelez e Operacional
        addOption(select, 'brand-mondelez', 'Mondelez');
        addOption(select, 'brand-Operacional', 'Operacional');
    } else {
        // Todas as opções (Sigma)
        Object.entries(brandNames).forEach(([value, text]) => {
            if (value !== 'brand-mondelez') { // Sigma não vê Mondelez no select de criação (opcional)
                addOption(select, value, text);
            }
        });
    }
}

function addOption(select, value, text) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.text = text;
    select.add(opt);
}

function updateFilterOptions() {
    const filters = [
        document.getElementById('filterIndustry'),
        document.getElementById('summaryFilterIndustry')
    ];

    filters.forEach(select => {
        if (!select) return;
        const currentValue = select.value;
        select.innerHTML = '<option value="all">Todos Fornecedores</option>';

        if (currentUserDivision === 'mondelez' && !allowedAdmins.includes(currentUsername)) {
            addOption(select, 'brand-mondelez', 'Mondelez');
            addOption(select, 'brand-Operacional', 'Operacional');
        } else {
            Object.entries(brandNames).forEach(([value, text]) => {
                if (value !== 'brand-mondelez') {
                    addOption(select, value, text);
                }
            });
        }
        if (Array.from(select.options).some(opt => opt.value === currentValue)) {
            select.value = currentValue;
        }
    });
}

function closeModal() {
    document.getElementById('eventModal').style.display = 'none';
}

// Lógica do Modal de Resumo
function openSummary() {
    const modal = document.getElementById('summaryModal');
    const list = document.getElementById('summaryList');
    if (!modal || !list) return;

    modal.style.display = 'flex';
    list.innerHTML = '';

    // Filtros internos do modal
    const filterIndustry = document.getElementById('summaryFilterIndustry')?.value || 'all';
    const filterMatrix = document.getElementById('summaryFilterMatrix')?.value || 'all';

    let allFilteredEvents = [];

    // Percorrer todos os meses nos dados para ver TODAS as atividades
    const allEventsSnapshot = AppStore.getEvents();
    Object.keys(allEventsSnapshot).forEach(fullKey => {
        const [year, month] = fullKey.split('-').map(Number);
        allEventsSnapshot[fullKey].forEach(event => {
            // SEGURANÇA (Estado): Filtra tarefas deletadas/arquivadas se o filtro não for específico
            if (event.status === 'deleted') return;
            if (event.status === 'archived' && filterStatus !== 'archived') return;
            if (event.status !== 'archived' && filterStatus === 'archived') return;

            // Filtros de categoria
            const matchesIndustry = filterIndustry === 'all' || event.industry === filterIndustry;
            const matchesMatrix = filterMatrix === 'all' || event.matrix === filterMatrix;

            // SEGURANÇA: Só mostra no resumo o que o usuário pode VER
            let matchesUser = false;
            if (currentUserRole === 'ADMIN') {
                if (viewingUser !== 'all') {
                    // Adm vendo um usuário específico: filtra por criador ou responsável
                    matchesUser = (event.createdBy === viewingUser || event.assignedTo === viewingUser);
                } else {
                    matchesUser = true;
                }
            } else if (currentUserRole === 'USER') {
                const isOwner = event.createdBy === currentUsername;
                const isAssigned = event.assignedTo === currentUsername;
                matchesUser = isOwner || isAssigned;
            } else { // VIEWER
                if (viewingUser !== 'all') {
                    matchesUser = event.visibility === 'public' && (event.createdBy === viewingUser || event.assignedTo === viewingUser);
                } else {
                    matchesUser = event.visibility === 'public';
                }
            }

            // ISOLAMENTO DE DIVISÃO (Obrigatório)
            const isFromCurrentDivision = event.division === currentUserDivision || (allowedAdmins.includes(currentUsername));
            if (!isFromCurrentDivision) {
                matchesUser = false;
            }

            if (matchesIndustry && matchesMatrix && matchesUser) {
                allFilteredEvents.push({ ...event, month, year });
            }
        });
    });

    // Ordenar por data
    allFilteredEvents.sort((a, b) => (a.year * 10000 + a.month * 100 + a.day) - (b.year * 10000 + b.month * 100 + b.day));

    if (allFilteredEvents.length === 0) {
        list.innerHTML = '<div class="summary-empty">Nenhuma atividade encontrada com estes filtros.</div>';
    } else {
        allFilteredEvents.forEach(event => {
            const item = document.createElement('div');
            item.className = 'summary-item';
            if (event.completed) {
                item.classList.add('event-completed');
            }

            const monthName = new Date(event.year, event.month - 1).toLocaleDateString('pt-BR', { month: 'long' });
            const dateDisplay = `${event.day} de ${monthName}${event.year !== new Date().getFullYear() ? ' de ' + event.year : ''}`;
            const checkIcon = event.completed ? ' ✅' : '';

            item.innerHTML = `
                <div class="summary-item-info">
                    <span class="summary-item-date">${dateDisplay}</span>
                    <span class="summary-item-title">${event.title}${checkIcon}</span>
                    <div class="summary-item-meta" style="font-size: 0.85em; opacity: 0.8; display: flex; gap: 15px; margin-top: 5px;">
                        ${event.assignedTo ? `<span>👤 <b>Resp:</b> ${getUserDisplayName(event.assignedTo)}</span>` : ''}
                        <span>📝 <b>Por:</b> ${getUserDisplayName(event.createdBy)}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <span class="summary-item-brand ${event.industry}">${brandNames[event.industry] || 'Marca'}</span>
                    <div class="legend-color" style="background: ${getMatrixColor(event.matrix)}; width: 12px; height: 12px; border-radius: 3px;"></div>
                    <button class="btn-delete-summary" onclick="deleteEventFromSummary('${event.year}-${String(event.month).padStart(2, '0')}', '${event.id}')" title="Excluir Tarefa">🗑️</button>
                </div>
            `;
            list.appendChild(item);
        });
    }
}

function getMatrixColor(matrix) {
    const colors = { 'do': '#ef4444', 'schedule': '#3b82f6', 'delegate': '#f59e0b', 'eliminate': '#94a3b8' };
    return colors[matrix] || '#fff';
}

function deleteEventFromSummary(fullKey, eventId) {
    const event = AppStore.getEvents()[fullKey]?.find(e => e.id === eventId);
    if (!event) return;

    if (currentUserRole === 'ADMIN') {
        // ADMIN: Escolhe entre arquivar ou excluir permanente
        customConfirm(`Atenção Administrador: Deseja ARQUIVAR ou EXCLUIR PERMANENTEMENTE a tarefa "${event.title}"?`, () => {
            // Callback para Excluir Permanente (comportamento padrão do botão confirmar no customConfirm legado)
            const taskTitle = event.title;
            const taskId = event.id;
            const deleted = AppStore.deleteEvent(fullKey, eventId);
            if (deleted) {
                addAuditLog('EXCLUSÃO PERMANENTE', taskId, taskTitle, event.industry, event.matrix);
                openSummary();
                generateCalendar(currentDate);
                showToast("Tarefa excluída permanentemente.");
            }
        }, "Excluir Permanente", "Arquivar", () => {
            // Callback para Arquivar
            archiveTask(fullKey, eventId);
            openSummary();
        });
    } else {
        // USER: Apenas Arquivar
        if (!canArchive(event)) {
            showToast("Você não tem permissão para arquivar esta tarefa.", "error");
            return;
        }
        customConfirm(`Deseja arquivar a tarefa "${event.title}"?`, () => {
            archiveTask(fullKey, eventId);
            openSummary();
        });
    }
}

function archiveTask(fullKey, eventId) {
    try {
        const success = AppStore.archiveEvent(fullKey, eventId);
        if (success) {
            const events = AppStore.getEvents()[fullKey] || [];
            const event = events.find(e => e.id === eventId);
            addAuditLog('ARQUIVAMENTO', eventId, event?.title || 'Tarefa', event?.industry, event?.matrix);
            generateCalendar(currentDate);
            showToast("Tarefa arquivada com sucesso.");
        }
    } catch (err) {
        showToast("Erro ao arquivar tarefa.", "error");
    }
}




function customConfirm(message, onConfirm, confirmText = "Confirmar", cancelText = "Cancelar", onCancel) {
    const modal = document.getElementById('confirmModal');
    const msgPara = document.getElementById('confirmMessage');
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.querySelector('.btn-cancel');

    if (modal && msgPara && confirmBtn) {
        msgPara.textContent = message;
        confirmBtn.textContent = confirmText;
        if (cancelBtn) cancelBtn.textContent = cancelText;

        modal.style.display = 'flex';

        confirmBtn.onclick = function () {
            onConfirm();
            closeConfirmModal();
        };

        if (cancelBtn) {
            cancelBtn.onclick = function () {
                if (onCancel) onCancel();
                closeConfirmModal();
            };
        }
    }
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

function openDayDetails(day, month, year) {
    const modal = document.getElementById('dayDetailsModal');
    const list = document.getElementById('dayDetailsList');
    const title = document.getElementById('dayDetailsTitle');
    if (!modal || !list) return;

    modal.style.display = 'flex';
    list.innerHTML = '';

    const monthName = new Date(year, month).toLocaleDateString('pt-BR', { month: 'long' });
    title.textContent = `📅 Tarefas de ${day} de ${monthName} de ${year}`;

    const fullKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const dayEvents = (AppStore.getEvents()[fullKey] || []).filter(e => e.day === day);


    if (dayEvents.length === 0) {
        list.innerHTML = '<div class="summary-empty">Nenhuma tarefa para este dia.</div>';
    } else {
        // Filtrar por divisão e permissão nos detalhes do dia também
        const filteredDayEvents = dayEvents.filter(event => {
            if (event.division !== currentUserDivision && !allowedAdmins.includes(currentUsername)) return false;

            if (currentUserRole === 'ADMIN') {
                if (viewingUser !== 'all') {
                    return (event.createdBy === viewingUser || event.assignedTo === viewingUser);
                }
                return true;
            } else if (currentUserRole === 'USER') {
                return event.createdBy === currentUsername || event.assignedTo === currentUsername || event.visibility === 'public';
            } else {
                return event.visibility === 'public';
            }
        });

        if (filteredDayEvents.length === 0) {
            list.innerHTML = '<div class="summary-empty">Nenhuma tarefa visível para você neste dia.</div>';
            return;
        }

        filteredDayEvents.forEach(event => {
            const item = document.createElement('div');
            item.className = 'summary-item';
            if (event.completed) {
                item.classList.add('event-completed');
            }
            const checkIcon = event.completed ? ' ✅' : '';

            item.innerHTML = `
                <div class="summary-item-info">
                    <span class="summary-item-title">${event.title}${checkIcon}</span>
                    <div class="summary-item-meta" style="font-size: 0.85em; opacity: 0.8; display: flex; gap: 15px; margin-top: 5px;">
                        ${event.assignedTo ? `<span>👤 <b>Resp:</b> ${getUserDisplayName(event.assignedTo)}</span>` : ''}
                        <span>📝 <b>Por:</b> ${getUserDisplayName(event.createdBy)}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <span class="summary-item-brand ${event.industry}">${brandNames[event.industry] || 'Marca'}</span>
                    <div class="legend-color" style="background: ${getMatrixColor(event.matrix)}; width: 12px; height: 12px; border-radius: 3px;"></div>
                    <button class="btn-delete-summary" onclick="deleteEventFromDayDetails('${fullKey}', ${day}, ${month}, ${year}, '${event.id}')" title="Excluir Tarefa">🗑️</button>
                </div>
            `;
            list.appendChild(item);
        });
    }
}

function closeDayDetails() {
    document.getElementById('dayDetailsModal').style.display = 'none';
}

function deleteEventFromDayDetails(fullKey, day, month, year, eventId) {
    const event = AppStore.getEvents()[fullKey]?.find(e => e.id === eventId);
    if (!event) return;

    if (currentUserRole === 'ADMIN') {
        customConfirm(`Atenção Administrador: Deseja ARQUIVAR ou EXCLUIR PERMANENTEMENTE a tarefa "${event.title}"?`, () => {
            const taskTitle = event.title;
            const taskId = event.id;
            const deleted = AppStore.deleteEvent(fullKey, eventId);
            if (deleted) {
                addAuditLog('EXCLUSÃO PERMANENTE', taskId, taskTitle, event.industry, event.matrix);
                openDayDetails(day, month, year);
                generateCalendar(currentDate);
                showToast("Tarefa excluída permanentemente.");
            }
        }, "Excluir Permanente", "Arquivar", () => {
            archiveTask(fullKey, eventId);
            openDayDetails(day, month, year);
        });
    } else {
        if (!canArchive(event)) {
            showToast("Você não tem permissão para arquivar esta tarefa.", "error");
            return;
        }
        customConfirm(`Deseja arquivar a tarefa "${event.title}"?`, () => {
            archiveTask(fullKey, eventId);
            openDayDetails(day, month, year);
        });
    }
}

function openEventDetail(event, fullKey) {
    const modal = document.getElementById('eventDetailModal');
    if (!modal) return;

    const logo = document.getElementById('detailLogo');
    const title = document.getElementById('detailTitle');
    const dateText = document.getElementById('detailDateText');
    const brandText = document.getElementById('detailBrandText');
    const priorityText = document.getElementById('detailPriorityText');
    const deleteBtn = document.getElementById('deleteDetailBtn');

    const [year, month] = fullKey.split('-').map(Number);
    const monthName = new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long' });

    logo.src = brandLogos[event.industry] || '';
    logo.onerror = () => logo.src = 'Imagens/Sigma.png'; // Fallback

    const timeText = event.time ? event.time + (event.endTime ? ' às ' + event.endTime : '') + ' - ' : '';
    title.textContent = timeText + event.title + (event.visibility === 'private' ? ' (🔒 Privada)' : '');
    dateText.textContent = `${event.day} de ${monthName} de ${year}`;
    brandText.textContent = brandNames[event.industry] || 'Marca';

    // Exibir Responsável e Criador (sempre para Admin, se participar para User)
    const creatorInfo = document.getElementById('detailCreatorInfo');
    const assignedInfo = document.getElementById('detailAssignedInfo');
    if (creatorInfo) {
        const canSee = currentUserRole === 'ADMIN' || event.createdBy === currentUsername || event.assignedTo === currentUsername;
        if (canSee) {
            // Verificar se o criador é um coordenador
            let isCreatorAdmin = false;
            for (const div in users) {
                if (users[div][event.createdBy] && users[div][event.createdBy].role === 'ADMIN') {
                    isCreatorAdmin = true;
                    break;
                }
            }

            const displayName = (isCreatorAdmin && currentUserRole !== 'ADMIN') ? 'Coordenação' : getUserDisplayName(event.createdBy);
            creatorInfo.innerHTML = `<b>Criado por:</b> ${displayName}`;
            creatorInfo.style.display = 'block';
        } else {
            creatorInfo.style.display = 'none';
        }
    }
    if (assignedInfo) {
        assignedInfo.innerHTML = `<b>Responsável:</b> ${getUserDisplayName(event.assignedTo) || 'Não atribuído'}`;
    }

    const matrixNames = { 'do': 'Fazer Agora', 'schedule': 'Agendar', 'delegate': 'Delegar', 'eliminate': 'Eliminar' };
    priorityText.textContent = matrixNames[event.matrix];
    priorityText.style.backgroundColor = getMatrixColor(event.matrix);

    // Controle de botões baseado em permissão
    const toggleBtn = document.getElementById('toggleCompleteDetailBtn');
    const completeWrapper = document.getElementById('completeWrapper');
    const completeLabel = document.getElementById('completeLabel');
    if (toggleBtn) {
        if (completeWrapper) completeWrapper.style.display = canEdit(event) ? 'flex' : 'none';
        toggleBtn.classList.remove('is-completed', 'is-reopening');
        if (event.completed) {
            toggleBtn.classList.add('is-completed', 'is-reopening');
            if (completeLabel) completeLabel.textContent = 'Reabrir Tarefa';
            toggleBtn.title = 'Reabrir Tarefa';
        } else {
            if (completeLabel) completeLabel.textContent = 'Marcar como Concluída';
            toggleBtn.title = 'Marcar como Concluída';
        }
        toggleBtn.onclick = () => {
            toggleEventCompletion(fullKey, event.id);
            closeEventDetail();
        };
    }

    if (deleteBtn) {
        if (currentUserRole === 'ADMIN') {
            deleteBtn.textContent = event.status === 'archived' ? 'Excluir Permanente' : 'Excluir/Arquivar';
            deleteBtn.style.display = 'block';
        } else {
            deleteBtn.textContent = 'Arquivar Tarefa';
            deleteBtn.style.display = canArchive(event) ? 'block' : 'none';
        }

        deleteBtn.onclick = () => {
            deleteEventFromSummary(fullKey, event.id);
            closeEventDetail();
        };
    }

    // Exibir e Configurar o Botão de Cancelar Recorrência
    const recurrenceInfo = document.getElementById('recurrenceInfo');
    const cancelRecurrenceBtn = document.getElementById('cancelRecurrenceBtn');

    if (recurrenceInfo && cancelRecurrenceBtn) {
        const hasSeries = !!event.seriesId;
        const allowed = hasSeries && (currentUserRole === 'ADMIN' || (currentUserRole === 'USER' && event.createdBy === currentUsername));

        if (allowed) {
            recurrenceInfo.style.display = 'block';
            cancelRecurrenceBtn.onclick = () => {
                customConfirm(
                    `Deseja realmente cancelar toda a série recorrente desta tarefa? Todas as repetições desta série serão apagadas.`,
                    async () => {
                        try {
                            const count = await AppStore.deleteEntireSeries(event.seriesId);
                            logAudit('DELETE_SERIES', event.id, event.title, event.industry, event.matrix);
                            showToast(`${count} tarefas recorrentes canceladas.`);
                            closeEventDetail();
                            generateCalendar(currentDate);
                        } catch (e) {
                            console.error(e);
                            showToast("Erro ao cancelar recorrência.", "error");
                        }
                    },
                    "Sim, Excluir Série",
                    "Cancelar"
                );
            };
        } else {
            recurrenceInfo.style.display = 'none';
        }
    }

    // Exibir Observações
    const descRow = document.getElementById('detailDescriptionRow');
    const descText = document.getElementById('detailDescriptionText');
    if (descRow && descText) {
        if (event.description) {
            descText.textContent = event.description;
            descRow.style.display = 'block';
        } else {
            descRow.style.display = 'none';
        }
    }

    // Exibir Anexo
    const attRow = document.getElementById('detailAttachmentRow');
    const attLink = document.getElementById('detailAttachmentLink');
    if (attRow && attLink) {
        if (event.attachment) {
            attLink.href = event.attachment;
            attLink.download = event.attachmentName || 'anexo';
            attLink.textContent = `📎 Baixar: ${event.attachmentName || 'Anexo'}`;
            attRow.style.display = 'block';
        } else {
            attRow.style.display = 'none';
        }
    }

    modal.style.display = 'flex';
}

function toggleEventCompletion(fullKey, eventId) {
    const monthEvents = AppStore.state.eventsData[fullKey] || [];
    const event = monthEvents.find(e => e.id === eventId);
    if (!event) return;

    try {
        const success = AppStore.updateEvent(fullKey, eventId, {
            completed: !event.completed,
            version: event.version
        });

        if (success) {
            const action = event.completed ? 'REABERTURA' : 'CONCLUSÃO';
            if (!event.completed && event.seriesId) processRecurrences();
            addAuditLog(action, event.id, event.title, event.industry, event.matrix);

            generateCalendar(currentDate);
            // Atualizar modais abertos
            if (document.getElementById('summaryModal').style.display === 'flex') openSummary();
            if (document.getElementById('dayDetailsModal').style.display === 'flex') {
                const [year, month] = fullKey.split('-').map(Number);
                openDayDetails(event.day, month - 1, year);
            }
        }
    } catch (err) {
        const msg = err.message.split('.').reduce((obj, key) => obj[key], ErrorMessages) || "Erro ao atualizar tarefa.";
        showToast(msg, "error");
    }
}


function closeEventDetail() {
    document.getElementById('eventDetailModal').style.display = 'none';
}

window.addEventListener('click', function (event) {
    const eventModal = document.getElementById('eventModal');
    const summaryModal = document.getElementById('summaryModal');
    const confirmModal = document.getElementById('confirmModal');
    const dayDetailsModal = document.getElementById('dayDetailsModal');
    const eventDetailModal = document.getElementById('eventDetailModal');
    const passwordResetModal = document.getElementById('passwordResetModal');

    if (event.target == eventModal) closeModal();
    if (event.target == summaryModal) closeSummary();
    if (event.target == confirmModal) closeConfirmModal();
    if (event.target == dayDetailsModal) closeDayDetails();
    if (event.target == eventDetailModal) closeEventDetail();
    if (event.target == passwordResetModal) closePasswordReset();
});

document.getElementById('eventForm').onsubmit = async function (e) {
    e.preventDefault();

    try {
        const dateParts = document.getElementById('eventDate').value.split('-');
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]);
        const day = parseInt(dateParts[2]);

        const title = document.getElementById('eventTitle').value;
        const industry = document.getElementById('eventIndustry').value;
        const matrix = document.getElementById('eventMatrix').value;
        const time = document.getElementById('eventTime').value;
        const eventEndTimeInput = document.getElementById('eventEndTime');
        const endTime = eventEndTimeInput ? eventEndTimeInput.value : '';
        const description = document.getElementById('eventDescription').value;
        const visibility = document.getElementById('eventVisibility').value;
        const assignedToSelect = document.getElementById('eventAssignedTo');
        const assignedTo = (currentUserRole === 'ADMIN' && assignedToSelect.value) ? assignedToSelect.value : currentUsername;

        // VALIDAÇÃO ACL (Segurança Real)
        if (!Permissions.can('create', currentUserRole, currentUsername)) {
            throw new Error("Você não tem permissão para criar tarefas.");
        }

        // Processamento do Anexo (Base64 limit 1MB)
        let base64Attachment = null;
        let attachmentName = null;
        const fileInput = document.getElementById('eventAttachment');
        if (fileInput && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            if (file.size > 1048576) {
                throw new Error('O anexo deve ter no máximo 1MB.');
            }
            base64Attachment = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
            attachmentName = file.name;
        }

        const isRecurring = document.getElementById('eventRecurrenceCheck')?.checked;
        const recurrenceType = document.getElementById('eventRecurrenceType')?.value;
        const recurrenceEnd = document.getElementById('eventRecurrenceEnd')?.value;
        const seriesId = isRecurring ? generateUUID('series_') : null;

        let instancesToCreate = isRecurring ? 3 : 1;
        let currentDateObj = new Date(year, month - 1, day);
        const endRecurrenceDateObj = recurrenceEnd ? new Date(recurrenceEnd + 'T00:00:00') : null;

        const reminderCheck = document.getElementById('eventReminder');
        const reminderTime = document.getElementById('eventReminderTime');

        for (let i = 0; i < instancesToCreate; i++) {
            if (endRecurrenceDateObj && currentDateObj > endRecurrenceDateObj) break;

            const curYear = currentDateObj.getFullYear();
            const curMonth = currentDateObj.getMonth() + 1;
            const curDay = currentDateObj.getDate();
            const curFullKey = `${curYear}-${String(curMonth).padStart(2, '0')}`;

            const eventData = {
                id: generateUUID(),
                day: curDay,
                industry,
                matrix,
                title,
                time,
                endTime,
                description,
                visibility,
                assignedTo,
                division: currentUserDivision,
                createdBy: currentUsername,
                status: 'active'
            };

            if (base64Attachment) {
                eventData.attachment = base64Attachment;
                eventData.attachmentName = attachmentName;
            }
            if (isRecurring) {
                eventData.seriesId = seriesId;
                eventData.recurrenceType = recurrenceType;
                eventData.recurrenceEnd = recurrenceEnd;
            }
            if (reminderCheck?.checked && reminderTime?.value) {
                eventData.reminder = true;
                eventData.reminderTime = reminderTime.value;
            }

            const success = AppStore.addEvent(curFullKey, eventData);
            if (!success) throw new Error("DATA.INVALID_EVENT");

            if (i === 0) addAuditLog('CRIAÇÃO', eventData.id, eventData.title, eventData.industry, eventData.matrix);

            if (isRecurring) {
                if (recurrenceType === 'daily') currentDateObj.setDate(currentDateObj.getDate() + 1);
                else if (recurrenceType === 'weekly') currentDateObj.setDate(currentDateObj.getDate() + 7);
                else if (recurrenceType === 'monthly') {
                    const originalDay = currentDateObj.getDate();
                    currentDateObj.setDate(1);
                    currentDateObj.setMonth(currentDateObj.getMonth() + 1);
                    const lastDay = new Date(
                        currentDateObj.getFullYear(),
                        currentDateObj.getMonth() + 1,
                        0
                    ).getDate();
                    currentDateObj.setDate(Math.min(originalDay, lastDay));
                }
            }
        }

        generateCalendar(currentDate);
        closeModal();
        if (fileInput) fileInput.value = '';
        document.getElementById('eventDescription').value = '';
        const recCheck = document.getElementById('eventRecurrenceCheck');
        if (recCheck) {
            recCheck.checked = false;
            document.getElementById('recurrenceOptions').style.display = 'none';
        }
        showToast(isRecurring ? "Série de tarefas iniciada!" : "Tarefa criada!");

    } catch (err) {
        console.error("Erro ao salvar tarefa:", err);
        showToast(err.message, "error");
    }
};


// Função deleteEvent legada removida (substituída por deleteEventFromSummary e deleteEventFromDayDetails usando IDs)

function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    generateCalendar(currentDate);
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    generateCalendar(currentDate);
}

function goToToday() {
    currentDate = new Date();
    generateCalendar(currentDate);
}

function filterByMonth(value) {
    if (!value) return;
    const [year, month] = value.split('-');
    currentDate = new Date(year, parseInt(month) - 1, 1);
    generateCalendar(currentDate);
}

// Lógica de Autenticação
function checkSession() {
    try {
        const sessionStr = localStorage.getItem('eisenhowerSession');
        console.log('SESSION RAW:', sessionStr); // DEBUG

        if (sessionStr) {
            const session = JSON.parse(sessionStr);
            console.log('SESSION PARSED:', session); // DEBUG

            if (session.username && session.division) {
                processRecurrences();
                showMainContent(session.username, session.division, session.role || 'USER', session.viewingUser || 'all');
                return;
            }
        }
    } catch (e) {
        console.error('SESSION ERROR:', e);
        localStorage.removeItem('eisenhowerSession');
    }

    // Fallback: mostrar login
    const loginScreen = document.getElementById('login-screen');
    const mainContainer = document.getElementById('main-container');
    if (loginScreen) loginScreen.style.display = 'flex';
    if (mainContainer) mainContainer.style.display = 'none';
}


function togglePasswordRequired(role) {
    try {
        console.log('togglePasswordRequired chamada para:', role);
        const usernameGroup = document.getElementById('usernameGroup');
        const viewerGroup = document.getElementById('viewerGroup');
        const passwordGroup = document.getElementById('passwordGroup');
        const forgotLink = document.getElementById('forgotPasswordLink');
        const divisionSelect = document.getElementById('loginDivision');
        const division = divisionSelect ? divisionSelect.value : '';

        if (!usernameGroup || !viewerGroup || !passwordGroup) {
            console.error('Elementos do formulário não encontrados!');
            return;
        }

        // Link de redefinição: APENAS para ADMIN
        if (forgotLink) forgotLink.style.display = (role === 'ADMIN') ? 'block' : 'none';

        if (role === 'VIEWER') {
            usernameGroup.style.display = 'none';
            viewerGroup.style.display = 'none';
            passwordGroup.style.display = 'none';
            const userInp = document.getElementById('username');
            const passInp = document.getElementById('password');
            if (userInp) userInp.removeAttribute('required');
            if (passInp) passInp.removeAttribute('required');
        } else if (role === 'ADMIN') {
            usernameGroup.style.display = 'block';
            viewerGroup.style.display = 'block';
            passwordGroup.style.display = 'block';
            const userInp = document.getElementById('username');
            const passInp = document.getElementById('password');
            if (userInp) userInp.setAttribute('required', 'required');
            if (passInp) passInp.setAttribute('required', 'required');
        } else {
            usernameGroup.style.display = 'block';
            viewerGroup.style.display = 'none';
            passwordGroup.style.display = 'block';
            const userInp = document.getElementById('username');
            const passInp = document.getElementById('password');
            if (userInp) userInp.setAttribute('required', 'required');
            if (passInp) passInp.setAttribute('required', 'required');
        }

        if (division && (role === 'VIEWER' || role === 'ADMIN')) {
            populateViewerSelect(division);
        }
    } catch (err) {
        console.error('Erro em togglePasswordRequired:', err);
    }
}


function updateViewerSelectOnDivisionChange(division) {
    const role = document.getElementById('loginRole').value;
    if (role === 'VIEWER' || role === 'ADMIN') {
        populateViewerSelect(division);
    }
}

function populateViewerSelect(division) {
    const select = document.getElementById('viewerUserSelect');
    if (!select || !users[division]) return;

    select.innerHTML = '';
    Object.keys(users[division]).forEach(username => {
        const displayName = username.split('.').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        const opt = document.createElement('option');
        opt.value = username;
        opt.textContent = displayName;
        select.appendChild(opt);
    });
}

function showMainContent(username, division, role, initialViewingUser) {
    try {
        console.log('Iniciando showMainContent para:', username, division, role);

        // Sincronizar com AppStore
        AppStore.state.user = { username, division, role };
        AppStore.state.viewingUser = initialViewingUser || 'all';

        // Fallback para variáveis globais legadas
        currentUserDivision = division;
        currentUserRole = role;
        currentUsername = username;
        viewingUser = AppStore.state.viewingUser;

        // Carregar dados iniciais
        const initialData = PersistenceProvider.loadEvents();
        AppStore.setEvents(initialData);

        // Troca de tela
        const loginScreen = document.getElementById('login-screen');
        const mainContainer = document.getElementById('main-container');

        if (loginScreen) loginScreen.style.display = 'none';
        if (mainContainer) mainContainer.style.display = 'block';

        // Aplicar Role no Body para CSS
        document.body.className = `role-${role.toLowerCase()}`;

        // Mostrar botões de ADMIN
        const adminAuditBtn = document.getElementById('adminAuditBtn');
        if (adminAuditBtn) {
            adminAuditBtn.style.display = (role === 'ADMIN') ? 'block' : 'none';
        }

        // Ocultar botão de trocar senha do header para USER e VIEWER
        const changePassBtn = document.querySelector('.btn-change-pass');
        if (changePassBtn) {
            changePassBtn.style.display = (role === 'ADMIN') ? 'flex' : 'none';
        }

        const adminFilterContainer = document.getElementById('adminUserFilterContainer');
        if (adminFilterContainer) {
            if (role === 'ADMIN' || role === 'VIEWER') {
                adminFilterContainer.style.display = 'block';
                populateAdminUserFilter(division);
                const filterInput = document.getElementById('adminUserFilter');
                if (filterInput) filterInput.value = viewingUser;
            } else {
                adminFilterContainer.style.display = 'none';
            }
        }

        // Configurar formulário baseado na Role
        const assignedToGroup = document.getElementById('assignedToGroup');
        if (assignedToGroup) {
            assignedToGroup.style.display = (role === 'ADMIN') ? 'block' : 'none';
            if (role === 'ADMIN') populateAssignedToSelect();
        }

        const userData = users[division] ? users[division][username] : null;
        const displayName = getUserDisplayName(username);
        const userSpan = document.getElementById('loggedUser');
        if (userSpan) {
            if (role === 'VIEWER') {
                userSpan.textContent = `Visualizador (Vendo: ${displayName})`;
            } else {
                let displayRole = role;
                if (role === 'ADMIN') displayRole = 'Administrador';
                else if (role === 'USER') displayRole = 'Colaborador';
                userSpan.textContent = `${displayName} (${displayRole})`;
            }
        }

        const avatarImg = document.getElementById('userAvatar');
        if (avatarImg && userData && userData.avatar) {
            avatarImg.src = userData.avatar;
        }

        const title = document.getElementById('mainTitle');
        if (title) title.textContent = `EQUIPE ${division.toUpperCase()}`;

        updateFilterOptions();

        const divisionLogo = document.getElementById('divisionLogo');
        if (divisionLogo) {
            if (division.toLowerCase() === 'sigma') divisionLogo.src = 'Imagens/Sigma.png';
            else if (division.toLowerCase() === 'mondelez') divisionLogo.src = 'Imagens/Mondelez.png';
        }

        generateCalendar(currentDate);
        console.log('showMainContent concluído com sucesso');
    } catch (err) {
        console.error('ERRO CRÍTICO EM showMainContent:', err);
        alert('Erro ao entrar no sistema: ' + err.message);
    }
}


const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.onsubmit = function (e) {
        e.preventDefault();
        try {
            const role = document.getElementById('loginRole').value;
            const division = document.getElementById('loginDivision').value;
            const user = document.getElementById('username').value.trim().toLowerCase();
            const pass = document.getElementById('password').value.trim();
            const errorMsg = document.getElementById('loginError');

            console.log('Tentativa de login:', { user, division, role });

            if (role === 'VIEWER') {
                const selectedTarget = document.getElementById('viewerUserSelect').value;
                if (!selectedTarget) {
                    errorMsg.textContent = 'Por favor, selecione um perfil para visualizar.';
                    return;
                }
                const session = { username: selectedTarget, division: division, role: role, viewingUser: selectedTarget };
                localStorage.setItem('eisenhowerSession', JSON.stringify(session));
                showMainContent(selectedTarget, division, role, selectedTarget);
                return;
            }

            const customPasswords = JSON.parse(localStorage.getItem('eisenhowerPasswords')) || {};
            const hasCustomPass = customPasswords[division] && customPasswords[division].hasOwnProperty(user);
            const isCustomPass = hasCustomPass && customPasswords[division][user] === pass;
            const isDefaultPass = !hasCustomPass && users[division] && users[division][user] && users[division][user].pass === pass;

            if (isCustomPass || isDefaultPass) {
                // Validar se é um administrador permitido
                if (role === 'ADMIN' && !allowedAdmins.includes(user)) {
                    errorMsg.textContent = 'Acesso negado: Este usuário não possui privilégios de Administrador.';
                    return;
                }

                const selectedTarget = (role === 'ADMIN') ? document.getElementById('viewerUserSelect').value : user;
                const session = { username: user, division: division, role: role, viewingUser: selectedTarget };
                localStorage.setItem('eisenhowerSession', JSON.stringify(session));
                showMainContent(user, division, role, selectedTarget);
                if (errorMsg) errorMsg.textContent = '';
            } else {
                if (errorMsg) errorMsg.textContent = 'Usuário ou senha incorretos para esta divisão.';
            }
        } catch (err) {
            console.error('ERRO NO SUBMIT DO LOGIN:', err);
            alert('Falha ao processar login: ' + err.message);
        }
    };
}



function populateAdminUserFilter(division) {
    const select = document.getElementById('adminUserFilter');
    if (!select || !users[division]) return;

    select.innerHTML = '<option value="all">👥 Ver Equipe Completa</option>';
    Object.keys(users[division]).forEach(username => {
        const displayName = username.split('.').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        const opt = document.createElement('option');
        opt.value = username;
        opt.textContent = `👤 Agenda de: ${displayName}`;
        select.appendChild(opt);
    });
}

function handleAdminUserFilter(val) {
    viewingUser = val;
    generateCalendar(currentDate);
}

function logout() {
    localStorage.removeItem('eisenhowerSession');
    location.reload();
}

function closeSummary() {
    document.getElementById('summaryModal').style.display = 'none';
}

// ========================================
// RECUPERAÇÃO / TROCA DE SENHA
// ========================================
function openPasswordReset() {
    document.getElementById('passwordResetModal').style.display = 'flex';
    document.getElementById('resetError').textContent = '';
    document.getElementById('resetSuccess').textContent = '';
}

function closePasswordReset() {
    document.getElementById('passwordResetModal').style.display = 'none';
}

// Abre o modal já pré-preenchido com o usuário logado
function openPasswordResetLoggedIn() {
    openPasswordReset();

    // Pré-preenche divisão
    const divSelect = document.getElementById('resetDivision');
    if (divSelect && currentUserDivision) {
        divSelect.value = currentUserDivision;
        populateResetUserSelect(currentUserDivision);
    }

    // Pré-seleciona o usuário logado
    const userSelect = document.getElementById('resetUserSelect');
    if (userSelect && currentUsername) {
        // Aguarda o populate terminar (é síncrono, então funciona direto)
        userSelect.value = currentUsername;
    }
}

function populateResetUserSelect(division) {
    const select = document.getElementById('resetUserSelect');
    if (!select || !users[division]) return;

    select.innerHTML = '';
    Object.keys(users[division]).forEach(username => {
        const displayName = username.split('.').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        const opt = document.createElement('option');
        opt.value = username;
        opt.textContent = displayName;
        select.appendChild(opt);
    });
}

const passwordResetForm = document.getElementById('passwordResetForm');
if (passwordResetForm) {
    passwordResetForm.onsubmit = function (e) {
        e.preventDefault();
        const division = document.getElementById('resetDivision').value;
        const user = document.getElementById('resetUserSelect').value;
        const newPass = document.getElementById('resetNewPassword').value;

        if (!division || !user || !newPass) return;

        let customPasswords = JSON.parse(localStorage.getItem('eisenhowerPasswords')) || {};
        if (!customPasswords[division]) customPasswords[division] = {};

        customPasswords[division][user] = newPass;
        localStorage.setItem('eisenhowerPasswords', JSON.stringify(customPasswords));

        document.getElementById('resetSuccess').textContent = 'Senha atualizada com sucesso! Use-a para entrar.';
        document.getElementById('resetError').textContent = '';
        document.getElementById('resetNewPassword').value = '';

        setTimeout(() => {
            closePasswordReset();
        }, 2000);
    };
}

// ========================================
// 1. BUSCA POR TEXTO
// ========================================
let searchQuery = '';
let searchTimeout = null;

function handleSearch(value) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchQuery = value.trim().toLowerCase();
        const clearBtn = document.getElementById('searchClear');
        if (clearBtn) clearBtn.classList.toggle('visible', searchQuery.length > 0);
        generateCalendar(currentDate);
    }, 300);
}

function clearSearch() {
    const input = document.getElementById('searchInput');
    if (input) input.value = '';
    searchQuery = '';
    document.getElementById('searchClear')?.classList.remove('visible');
    generateCalendar(currentDate);
}

// ========================================
// 2. PUSH NOTIFICATIONS / LEMBRETES
// ========================================
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

let reminderRunning = false;
function checkReminders() {
    if (reminderRunning) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    reminderRunning = true;
    try {
        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const currentTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        const fullKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const todayEvents = (AppStore.getEvents()[fullKey] || []).filter(e => e.day === now.getDate());

        todayEvents.forEach(event => {
            if (event.reminder && event.reminderTime === currentTime) {
                const notifKey = `notified_${event.id}_${today}_${currentTime}`;
                if (!sessionStorage.getItem(notifKey)) {
                    new Notification('🔔 Lembrete - Agenda de Funções', {
                        body: `${event.title}\n${brandNames[event.industry] || 'Tarefa'}`,
                        icon: brandLogos[event.industry] || 'Imagens/Sigma.png'
                    });
                    sessionStorage.setItem(notifKey, '1');
                }
            }
        });
    } finally {
        reminderRunning = false;
    }
}

setInterval(checkReminders, 60000);

// ========================================
// 3. EXPORTAR PDF / EXCEL (Implementações completas movidas para o final do arquivo)
// ========================================

// ========================================
// 4. TEMA CLARO / ESCURO
// ========================================
function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    localStorage.setItem('eisenhowerTheme', next);
    const icon = next === 'light' ? '☀️' : '🌙';
    const btn = document.getElementById('themeToggleInline');
    if (btn) btn.textContent = icon;
    const loginBtn = document.getElementById('loginThemeBtn');
    if (loginBtn) loginBtn.textContent = icon;
}

function loadTheme() {
    const saved = localStorage.getItem('eisenhowerTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    const icon = saved === 'light' ? '☀️' : '🌙';
    const btn = document.getElementById('themeToggleInline');
    if (btn) btn.textContent = icon;
    const loginBtn = document.getElementById('loginThemeBtn');
    if (loginBtn) loginBtn.textContent = icon;
}

loadTheme();

// ========================================
// 5. CONTADOR DE TAREFAS
// ========================================
function updatePriorityCounters() {
    const yearKey = currentDate.getFullYear();
    const monthKey = String(currentDate.getMonth() + 1).padStart(2, '0');
    const fullKey = `${yearKey}-${monthKey}`;
    const monthEvents = AppStore.getEvents()[fullKey] || [];

    const counts = { do: 0, schedule: 0, delegate: 0, eliminate: 0 };
    monthEvents.forEach(e => { if (counts.hasOwnProperty(e.matrix)) counts[e.matrix]++; });

    const ids = { do: 'counterDo', schedule: 'counterSchedule', delegate: 'counterDelegate', eliminate: 'counterEliminate' };
    Object.entries(ids).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (el) {
            const oldVal = parseInt(el.textContent);
            el.textContent = counts[key];
            if (oldVal !== counts[key]) {
                el.classList.remove('pulse');
                void el.offsetWidth;
                el.classList.add('pulse');
            }
        }
    });

    const completedPercentEl = document.getElementById('counterCompletedPercent');
    if (completedPercentEl) {
        const total = monthEvents.length;
        const completed = monthEvents.filter(e => e.completed).length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        completedPercentEl.textContent = `${percent}%`;
    }
}

// ========================================
// 6. DRAG & DROP
// ========================================
let draggedEvent = null;
let draggedFullKey = '';

function setupDragDrop(eventDiv, event, fullKey) {
    // Validar dragstart via ACL
    eventDiv.setAttribute('draggable', Permissions.can('drag', currentUserRole, currentUsername, event) ? 'true' : 'false');

    eventDiv.addEventListener('dragstart', (e) => {
        if (!Permissions.can('drag', currentUserRole, currentUsername, event)) {
            e.preventDefault();
            return;
        }
        draggedEvent = event;
        draggedFullKey = fullKey;
        eventDiv.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', event.id);
    });

    eventDiv.addEventListener('dragend', () => {
        eventDiv.classList.remove('dragging');
        draggedEvent = null;
        draggedFullKey = '';
    });
}

function setupCellDrop(cell, dayNumber, isCurrentMonth) {
    if (!isCurrentMonth) return;
    cell.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        cell.classList.add('drag-over');
    });
    cell.addEventListener('dragleave', () => cell.classList.remove('drag-over'));
    cell.addEventListener('drop', (e) => {
        e.preventDefault();
        cell.classList.remove('drag-over');
        if (!draggedEvent || !draggedFullKey) return;

        // VALIDAÇÃO ACL NO DROP (Segurança Real)
        if (!Permissions.can('drag', currentUserRole, currentUsername, draggedEvent)) {
            showToast("Você não tem permissão para mover esta tarefa.", "error");
            return;
        }

        const yearKey = currentDate.getFullYear();
        const monthKey = String(currentDate.getMonth() + 1).padStart(2, '0');
        const targetKey = `${yearKey}-${monthKey}`;

        if (draggedFullKey === targetKey && draggedEvent.day !== dayNumber) {
            try {
                const success = AppStore.updateEvent(draggedFullKey, draggedEvent.id, {
                    day: dayNumber,
                    version: draggedEvent.version // Passa a versão atual para validar conflito
                });

                if (success) {
                    generateCalendar(currentDate);
                    showToast("Tarefa movida com sucesso!");
                }
            } catch (err) {
                console.error("Erro ao mover tarefa:", err);
                const msg = err.message.split('.').reduce((obj, key) => obj[key], ErrorMessages) || "Erro ao processar alteração.";
                showToast(msg, "error");
            }
        }

        draggedEvent = null;
        draggedFullKey = '';
    });
}


// Inicializar verificação ao carregar o DOM
document.addEventListener('DOMContentLoaded', () => {
    try {
        requestNotificationPermission();
        checkSession();
    } catch (e) {
        console.error("Erro na inicialização da sessão:", e);
    }
});

// ========================================
// 7. GOOGLE SHEETS SYNC
// ========================================
const GOOGLE_SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby_GWWYa1LH9-uRyL37eNi9MEymzeJau5Ga04L3-qFdqMbYMYjYbz6I0KubqZk2kBlhNw/exec'; // URL CONFIGURADA

async function syncWithSheets() {
    const btn = document.getElementById('syncBtn');
    if (btn) {
        btn.style.animation = 'spin 1s linear infinite';
    }

    try {
        // 1. Garantir que os dados locais atuais estão salvos antes de mesclar
        await AppStore.persist();

        // 2. Tentar baixar dados e logs da nuvem
        const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL);
        if (!response.ok) throw new Error('Falha na conexão com a nuvem.');

        const data = await response.json();
        const cloudEvents = data.eventsData || {};
        const cloudLogs = data.auditLogs || [];

        // 3. MESCLAGEM ROBUSTA: Local + Nuvem (Sem perdas)
        const localSnapshot = AppStore.getEvents();
        const newMergedData = { ...localSnapshot };

        Object.keys(cloudEvents).forEach(monthKey => {
            if (!newMergedData[monthKey]) {
                newMergedData[monthKey] = cloudEvents[monthKey];
            } else {
                // Adiciona apenas o que não existe localmente ou atualiza
                cloudEvents[monthKey].forEach(cloudEv => {
                    const localIdx = newMergedData[monthKey].findIndex(e => e.id === cloudEv.id);
                    if (localIdx === -1) {
                        newMergedData[monthKey].push(cloudEv);
                    } else {
                        // Resolução de Conflitos baseada em Versão (impede que tarefas apagadas localmente ressurjam)
                        const localEv = newMergedData[monthKey][localIdx];
                        if ((localEv.version || 1) >= (cloudEv.version || 1)) {
                            newMergedData[monthKey][localIdx] = { ...cloudEv, ...localEv };
                        } else {
                            newMergedData[monthKey][localIdx] = { ...localEv, ...cloudEv };
                        }
                    }
                });
            }
        });

        AppStore.setEvents(newMergedData);
        generateCalendar(currentDate);

        // 4. Mesclagem de Logs
        const localLogs = JSON.parse(localStorage.getItem('eisenhowerAuditLogs')) || [];
        const combinedLogs = [...cloudLogs, ...localLogs].filter((v, i, a) =>
            a.findIndex(t => t.date === v.date && t.taskId === v.taskId) === i
        );
        localStorage.setItem('eisenhowerAuditLogs', JSON.stringify(combinedLogs.slice(-1000)));

        // 5. Enviar de volta para a nuvem
        await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({
                eventsData: AppStore.getEvents(),
                auditLogs: combinedLogs.slice(-1000)
            }),
            headers: { 'Content-Type': 'text/plain' }
        });

        showToast('Sincronização completa (Dados locais preservados)');
    } catch (err) {
        console.error('Erro na sincronização:', err);
        showToast('Falha ao sincronizar: ' + err.message, 'error');
    } finally {
        if (btn) {
            btn.style.animation = 'none';
        }
    }
}

function getUserDisplayName(username) {
    if (!username) return '';
    return username.split('.').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function populateAssignedToSelect() {
    const select = document.getElementById('eventAssignedTo');
    if (!select || !currentUserDivision) return;
    select.innerHTML = '<option value="">Selecione o Responsável</option>';
    const usersInDivision = users[currentUserDivision] || {};
    Object.keys(usersInDivision).forEach(username => {
        const displayName = getUserDisplayName(username);
        const opt = document.createElement('option');
        opt.value = username;
        opt.textContent = displayName;
        select.appendChild(opt);
    });
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? '✅' : '❌';

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Remover após 3 segundos
    setTimeout(() => {
        toast.style.animation = 'toastFadeOut 0.5s forwards';
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 3000);
}

function openAuditModal() {
    document.getElementById('auditModal').style.display = 'flex';
    renderAuditLogs();
}

function closeAuditModal() {
    document.getElementById('auditModal').style.display = 'none';
}

function renderAuditLogs() {
    const list = document.getElementById('auditLogList');
    const search = document.getElementById('auditSearch')?.value.toLowerCase() || '';
    if (!list) return;

    const logs = JSON.parse(localStorage.getItem('eisenhowerAuditLogs')) || [];
    list.innerHTML = '';

    const filteredLogs = logs.filter(log =>
        (log.user && log.user.toLowerCase().includes(search)) ||
        (log.title && log.title.toLowerCase().includes(search)) ||
        (log.action && log.action.toLowerCase().includes(search))
    ).reverse(); // Mais novos primeiro

    if (filteredLogs.length === 0) {
        list.innerHTML = '<div class="summary-empty">Nenhum log encontrado.</div>';
        return;
    }

    filteredLogs.forEach(log => {
        const item = document.createElement('div');
        item.className = 'summary-item';

        const industryDisplay = log.industry ? `<span class="summary-item-brand ${log.industry}" style="font-size: 0.75em; padding: 2px 8px;">${brandNames[log.industry] || log.industry}</span>` : '';
        const matrixColor = getMatrixColor(log.matrix);
        const matrixDisplay = log.matrix ? `<div class="legend-color" style="background: ${matrixColor}; width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 5px;"></div>` : '';

        item.innerHTML = `
            <div class="summary-item-info" style="width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span style="font-size: 0.8em; color: var(--accent); font-weight: 600;">${log.date}</span>
                    ${industryDisplay}
                </div>
                <span class="summary-item-title">
                    <b>${getUserDisplayName(log.user)}</b> 
                    <span style="color: var(--primary-color); font-weight: 600;">${log.action}</span>
                </span>
                <div style="display: flex; align-items: center; gap: 10px; margin-top: 4px;">
                    ${matrixDisplay}
                    <small style="opacity: 0.8; font-size: 0.9em;">Tarefa: <b>${log.title}</b></small>
                </div>
                <div style="font-size: 0.75em; opacity: 0.6; margin-top: 5px;">
                    ID: ${log.taskId} | Divisão: ${log.division?.toUpperCase()}
                </div>
            </div>
        `;
        list.appendChild(item);
    });
}

// --- EXPORTAÇÃO ---
function getFilteredEventsForExport() {
    const filterIndustry = document.getElementById('filterIndustry')?.value || 'all';
    const filterMatrix = document.getElementById('filterMatrix')?.value || 'all';
    const filterStatus = document.getElementById('filterStatus')?.value || 'all';
    const searchQuery = document.getElementById('searchInput')?.value || '';

    let exportedEvents = [];
    const eventsData = AppStore.getEvents();

    Object.keys(eventsData).forEach(fullKey => {
        const [year, month] = fullKey.split('-').map(Number);
        const processedEvents = EventPipeline.process(fullKey, currentUsername, currentUserRole);

        processedEvents.forEach(event => {
            const matchesIndustry = filterIndustry === 'all' || event.industry === filterIndustry;
            const matchesMatrix = filterMatrix === 'all' || event.matrix === filterMatrix;
            let matchesStatus = true;
            if (filterStatus === 'archived') {
                matchesStatus = event.status === 'archived';
            } else {
                if (event.status === 'archived') matchesStatus = false;
                else if (filterStatus === 'pending') matchesStatus = !event.completed;
                else if (filterStatus === 'completed') matchesStatus = event.completed;
            }

            let matchesUser = false;
            if (currentUserRole === 'ADMIN') {
                if (viewingUser !== 'all') {
                    matchesUser = (event.createdBy === viewingUser || event.assignedTo === viewingUser);
                } else {
                    matchesUser = true;
                }
            } else if (currentUserRole === 'USER') {
                matchesUser = event.createdBy === currentUsername || event.assignedTo === currentUsername || event.visibility === 'public';
            } else {
                matchesUser = event.visibility === 'public';
            }

            const isFromCurrentDivision = event.division === currentUserDivision || (allowedAdmins.includes(currentUsername));
            if (!isFromCurrentDivision) {
                matchesUser = false;
            }

            const matchesSearch = !searchQuery || event.title.toLowerCase().includes(searchQuery.toLowerCase());
            if (matchesIndustry && matchesMatrix && matchesStatus && matchesSearch && matchesUser) {
                exportedEvents.push({ ...event, month, year });
            }
        });
    });

    exportedEvents.sort((a, b) => (a.year * 10000 + a.month * 100 + a.day) - (b.year * 10000 + b.month * 100 + b.day));
    return exportedEvents;
}

function getExportHeader() {
    const now = new Date();
    return {
        title: `RELATÓRIO AGENDA - ${currentUserDivision.toUpperCase()}`,
        month: document.getElementById('currentMonthDisplay')?.textContent || '',
        user: `${getUserDisplayName(currentUsername)} (${currentUserRole})`,
        viewing: viewingUser === 'all' ? 'Equipe Completa' : getUserDisplayName(viewingUser),
        date: now.toLocaleString('pt-BR'),
        filters: `Status: ${document.getElementById('filterStatus')?.options[document.getElementById('filterStatus').selectedIndex].text} | Indústria: ${document.getElementById('filterIndustry')?.options[document.getElementById('filterIndustry').selectedIndex].text}`
    };
}

function exportExcel() {
    const events = getFilteredEventsForExport();
    const header = getExportHeader();

    // Preparar dados
    const data = [
        [header.title],
        [`Mês: ${header.month}`, `Usuário: ${header.user}`],
        [`Visualizando: ${header.viewing}`, `Exportado: ${header.date}`],
        [`Filtros: ${header.filters}`, `Total de Tarefas: ${events.length}`],
        [],
        ['DIA', 'TÍTULO', 'MARCA', 'PRIORIDADE', 'HORA', 'CONCLUÍDA', 'RESPONSÁVEL', 'CRIADO POR', 'VISIBILIDADE', 'DIVISÃO', 'OBSERVAÇÕES', 'ARQUIVADA', 'LEMBRETE']
    ];

    let completedCount = 0;

    events.forEach(e => {
        if (e.completed) completedCount++;
        const timeStr = e.time ? e.time + (e.endTime ? ` até ${e.endTime}` : '') : '-';
        const matrixNames = { 'do': 'Fazer Agora', 'schedule': 'Agendar', 'delegate': 'Delegar', 'eliminate': 'Eliminar' };

        data.push([
            `${String(e.day).padStart(2, '0')}/${String(e.month).padStart(2, '0')}`,
            e.title,
            brandNames[e.industry] || '-',
            matrixNames[e.matrix] || '-',
            timeStr,
            e.completed ? 'SIM' : 'NÃO',
            getUserDisplayName(e.assignedTo) || '-',
            getUserDisplayName(e.createdBy) || '-',
            e.visibility === 'public' ? 'Pública' : 'Privada',
            (e.division || '').toUpperCase(),
            e.description || '-',
            e.status === 'archived' ? 'SIM' : 'NÃO',
            e.reminder ? `SIM (${e.reminderTime})` : 'NÃO'

        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Auto-size columns slightly
    const wscols = [
        { wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 12 }, { wch: 15 }
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Agenda");

    const fileName = `agenda_${currentUserDivision.toUpperCase()}_${new Date().getFullYear()}_${String(new Date().getMonth() + 1).padStart(2, '0')}_${currentUsername.replace(/\./g, '_')}.xlsx`;
    XLSX.writeFile(wb, fileName);

    showToast("Excel exportado com sucesso!");
    closeExportDropdown();
}

function exportPDF() {
    const events = getFilteredEventsForExport();
    const headerData = getExportHeader();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');

    doc.setFontSize(16);
    doc.text(headerData.title, 14, 15);

    doc.setFontSize(10);
    doc.text(`Mês: ${headerData.month} | Usuário: ${headerData.user}`, 14, 22);
    doc.text(`Visualizando: ${headerData.viewing}`, 14, 27);
    doc.text(`Exportado: ${headerData.date}`, 14, 32);

    let completedCount = 0;
    const tableData = events.map(e => {
        if (e.completed) completedCount++;
        const timeStr = e.time ? e.time + (e.endTime ? ` - ${e.endTime}` : '') : '-';
        const matrixNames = { 'do': 'Fazer Agora', 'schedule': 'Agendar', 'delegate': 'Delegar', 'eliminate': 'Eliminar' };

        return [
            `${String(e.day).padStart(2, '0')}/${String(e.month).padStart(2, '0')}`,
            e.title.length > 25 ? e.title.substring(0, 25) + '...' : e.title,
            (brandNames[e.industry] || '-').substring(0, 10),
            matrixNames[e.matrix] || '-',
            timeStr,
            e.completed ? 'SIM' : 'NÃO',
            (getUserDisplayName(e.assignedTo) || '-').split(' ')[0],
            (getUserDisplayName(e.createdBy) || '-').split(' ')[0],
            e.visibility === 'public' ? 'Pública' : 'Privada',
            (e.division || '').toUpperCase(),
            (e.description || '-').substring(0, 20),
            e.status === 'archived' ? 'SIM' : 'NÃO',
            e.reminder ? 'SIM' : 'NÃO'

        ];
    });

    doc.text(`Total: ${events.length} tarefas | Concluídas: ${completedCount} (${events.length > 0 ? Math.round((completedCount / events.length) * 100) : 0}%)`, 14, 37);
    doc.text(`Filtros: ${headerData.filters}`, 14, 42);

    doc.autoTable({
        startY: 47,
        head: [['DIA', 'TÍTULO', 'MARCA', 'PRIORIDADE', 'HORA', 'CONCLUÍDA', 'RESPONSÁVEL', 'CRIADO POR', 'VISIBILIDADE', 'DIVISÃO', 'OBSERVAÇÕES', 'ARQ.', 'LEMBRETE']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 }
    });

    const fileName = `agenda_${currentUserDivision.toUpperCase()}_${new Date().getFullYear()}_${String(new Date().getMonth() + 1).padStart(2, '0')}_${currentUsername.replace(/\./g, '_')}.pdf`;
    doc.save(fileName);

    showToast("PDF exportado com sucesso!");
    closeExportDropdown();
}

function toggleExportDropdown() {
    const dropdown = document.getElementById('exportDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }
}

function closeExportDropdown() {
    const dropdown = document.getElementById('exportDropdown');
    if (dropdown) dropdown.style.display = 'none';
}

window.addEventListener('click', function (e) {
    if (!e.target.closest('.export-wrapper')) {
        closeExportDropdown();
    }
});

// --- RECORRÊNCIAS INTELIGENTES ---
function processRecurrences() {
    const seriesMap = {};
    const eventsData = AppStore.getEvents();

    Object.keys(eventsData).forEach(fullKey => {
        const [year, month] = fullKey.split('-').map(Number);
        eventsData[fullKey].forEach(event => {
            if (event.seriesId && event.status !== 'deleted') {
                if (!seriesMap[event.seriesId]) {
                    seriesMap[event.seriesId] = {
                        events: [],
                        type: event.recurrenceType,
                        endDate: event.recurrenceEnd,
                        template: event
                    };
                }
                const eventDate = new Date(year, month - 1, event.day);
                seriesMap[event.seriesId].events.push({ ...event, fullKey, eventDate });
            }
        });
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    Object.keys(seriesMap).forEach(seriesId => {
        const series = seriesMap[seriesId];
        if (series.events.length === 0) return; // Nenhuma tarefa ativa restante na série
        series.events.sort((a, b) => a.eventDate - b.eventDate);
        const lastInstance = series.events[series.events.length - 1];

        const activeInstances = series.events.filter(e => !e.completed && e.status === 'active' && e.eventDate >= today);
        const targetActiveCount = 3;

        if (activeInstances.length < targetActiveCount) {
            const endRecurrenceDateObj = series.endDate ? new Date(series.endDate + 'T00:00:00') : null;
            let instancesToGenerate = targetActiveCount - activeInstances.length;
            let currentDateObj = new Date(lastInstance.eventDate);

            for (let i = 0; i < instancesToGenerate; i++) {
                if (series.type === 'daily') currentDateObj.setDate(currentDateObj.getDate() + 1);
                if (series.type === 'weekly') currentDateObj.setDate(currentDateObj.getDate() + 7);
                if (series.type === 'monthly') {
                    const originalDay = currentDateObj.getDate();
                    currentDateObj.setDate(1);
                    currentDateObj.setMonth(currentDateObj.getMonth() + 1);
                    const lastDay = new Date(
                        currentDateObj.getFullYear(),
                        currentDateObj.getMonth() + 1,
                        0
                    ).getDate();
                    currentDateObj.setDate(Math.min(originalDay, lastDay));
                }

                if (endRecurrenceDateObj && currentDateObj > endRecurrenceDateObj) break;

                const curYear = currentDateObj.getFullYear();
                const curMonth = currentDateObj.getMonth() + 1;
                const curDay = currentDateObj.getDate();
                const curFullKey = `${curYear}-${String(curMonth).padStart(2, '0')}`;

                const newEvent = {
                    ...series.template,
                    id: generateUUID(),
                    day: curDay,
                    completed: false,
                    version: 1
                };

                AppStore.addEvent(curFullKey, newEvent);
            }
        }
    });
}
