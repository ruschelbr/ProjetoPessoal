function adicionarEvento(id, nomeEvento, callback) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.addEventListener(nomeEvento, callback);
    }
}

let produtos = [];
let clientes = [];
let locacoes = [];
let operadorAutenticado = false;
const SENHA_PADRAO = '140906';
let contratosMap = {};
let categoriaAtiva = null;
let subcategoriaAtiva = null;
let filtroPlacaVideo = null;

let categoriaAtivaLocar = null;
let subcategoriaAtivaLocar = null;
let filtroPlacaVideoLocar = null;

const CATEGORIAS = {
    "Notebooks": {
        "I3": true,
        "I5": true,
        "I7": true,
        "Ryzen": true,
        "MacBook": true
    },
    "Tablets": {
        "Samsung Tab A": true,
        "Samsung S6": true,
        "Samsung S10": true
    },
    "Impressoras": {
        "Multifuncional Color Cânon 3110": true,
        "Multifuncional Laser": true
    },
    "Monitores": {
        "19\"": true,
        "20\"": true,
        "21\"": true
    },
    "TVs": {
        "43 polegadas": true,
        "55 polegadas": true
    },
    "Celulares": {
        "iPhone 15 Pro Max": true,
        "iPhone 15 Pro": true
    },
    "Projetores": {
        "Epson": true
    },
    "Telas de Projeção": true
};

const firebaseConfig = window.FIREBASE_CONFIG;
let db = null;

function iniciarFirebase() {
    if (!firebaseConfig) {
        console.warn('Configuracao do Firebase nao encontrada.');
        return false;
    }
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.database();
    return true;
}

function abrirPagina(pagina) {
    if (!operadorAutenticado) return;
    const mapa = {
        'dashboard': 'index.html',
        'equipamentos': 'equipamentos.html',
        'clientes': 'clientes.html',
        'historico': 'historico.html'
    };
    const destino = mapa[pagina];
    if (destino) {
        window.location.href = destino;
    }
}

function skeletonCards(n, tipo) {
    let html = '<div class="' + tipo + '-grid">';
    for (let i = 0; i < n; i++) {
        html += '<div class="' + (tipo === 'equipamentos' ? 'product' : 'client') + '-card skeleton-card">';
        html += '<span class="skeleton" style="height:11px;width:50%;margin-bottom:14px;"></span>';
        html += '<span class="skeleton" style="height:18px;width:78%;margin-bottom:12px;"></span>';
        html += '<span class="skeleton" style="height:12px;width:55%;margin-bottom:8px;"></span>';
        html += '<span class="skeleton" style="height:12px;width:40%;"></span>';
        html += '</div>';
    }
    html += '</div>';
    return html;
}

function skeletonLinhas(n, colunas) {
    let html = '';
    for (let i = 0; i < n; i++) {
        html += '<div style="display:flex;gap:16px;padding:14px 16px;border-bottom:1px solid rgba(94,82,64,0.12);">';
        for (let c = 0; c < colunas; c++) {
            const w = [55, 30, 25, 20, 20, 20][c] || 20;
            html += '<span class="skeleton" style="height:14px;flex:' + w + ';border-radius:4px;"></span>';
        }
        html += '</div>';
    }
    return html;
}

function ativarPaginaAtual() {
    const pagina = document.body.dataset.page;
    if (!pagina) return;

    if (pagina === 'dashboard') {
        const cont = document.getElementById('locacoesAtivas');
        if (cont) cont.innerHTML = skeletonLinhas(5, 6);
    } else if (pagina === 'equipamentos') {
        renderizarFiltrosCategorias();
        renderizarSubcategoriasFiltro();
        const cont = document.getElementById('equipamentosList');
        if (cont) cont.innerHTML = skeletonCards(6, 'equipamentos');
    } else if (pagina === 'clientes') {
        const cont = document.getElementById('clientesList');
        if (cont) cont.innerHTML = skeletonCards(6, 'clientes');
    } else if (pagina === 'historico') {
        const cont = document.getElementById('historicoList');
        if (cont) cont.innerHTML = '<div style="overflow-x:auto;">' + skeletonLinhas(6, 7) + '</div>';
    }
}

function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function fecharModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

function mostrarAviso(msg, tipo) {
    const notif = document.createElement('div');
    notif.className = 'notificacao' + (tipo === 'error' ? ' error' : '');
    notif.textContent = msg;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

function carregarDadosFirebase() {
    db.ref('produtos').on('value', (snapshot) => {
        const data = snapshot.val();
        produtos = data ? Object.values(data) : [];
        const paginaEquipamentos = document.getElementById('equipamentos');
        if (paginaEquipamentos && paginaEquipamentos.classList.contains('active')) {
            renderizarEquipamentos();
        }
    });

    db.ref('clientes').on('value', (snapshot) => {
        const data = snapshot.val();
        clientes = data ? Object.values(data) : [];
        const paginaClientes = document.getElementById('clientes');
        if (paginaClientes && paginaClientes.classList.contains('active')) {
            renderizarClientes();
        }
    });

    db.ref('locacoes').on('value', (snapshot) => {
        const data = snapshot.val();
        locacoes = data ? Object.values(data) : [];
        atualizarPainel();
        const paginaClientes = document.getElementById('clientes');
        if (paginaClientes && paginaClientes.classList.contains('active')) {
            renderizarClientes();
        }
        const paginaEquipamentos = document.getElementById('equipamentos');
        if (paginaEquipamentos && paginaEquipamentos.classList.contains('active')) {
            renderizarEquipamentos();
        }
    });
}

function salvarProduto(produto) {
    db.ref('produtos/' + produto.id).set(produto).then(() => {
        mostrarAviso('Produto salvo com sucesso!');
    }).catch(err => {
        console.error('Erro ao salvar produto:', err.message);
        mostrarAviso('Erro ao salvar: ' + err.message, 'error');
    });
}

function excluirProdutoFirebase(produtoId) {
    db.ref('produtos/' + produtoId).remove().then(() => {
        mostrarAviso('Produto deletado!');
    }).catch(err => {
        console.error('Erro ao deletar:', err.message);
        mostrarAviso('Erro ao deletar: ' + err.message, 'error');
    });
}

function salvarCliente(cliente) {
    db.ref('clientes/' + cliente.id).set(cliente).then(() => {
        mostrarAviso('Cliente salvo com sucesso!');
    }).catch(err => {
        console.error('Erro ao salvar cliente:', err.message);
        mostrarAviso('Erro ao salvar: ' + err.message, 'error');
    });
}

function excluirClienteFirebase(clienteId) {
    db.ref('clientes/' + clienteId).remove().then(() => {
        mostrarAviso('Cliente deletado!');
    }).catch(err => {
        console.error('Erro ao deletar:', err.message);
        mostrarAviso('Erro ao deletar: ' + err.message, 'error');
    });
}

function salvarLocacao(locacao) {
    db.ref('locacoes/' + locacao.id).set(locacao).then(() => {
        mostrarAviso('Locacao criada com sucesso!');
    }).catch(err => {
        console.error('Erro ao salvar locacao:', err.message);
        mostrarAviso('Erro ao salvar: ' + err.message, 'error');
    });
}

function salvarContratoFirebase(locacaoId, arquivo) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const contratoData = {
            nome: arquivo.name,
            tamanho: arquivo.size,
            tipo: arquivo.type,
            data: e.target.result
        };
        db.ref('contratos/' + locacaoId).set(contratoData).then(() => {
            mostrarAviso('Contrato anexado com sucesso!');
            contratosMap[locacaoId] = contratoData;
        }).catch(err => {
            console.error('Erro ao salvar contrato:', err.message);
            mostrarAviso('Erro ao salvar contrato: ' + err.message, 'error');
        });
    };
    reader.onerror = function() {
        mostrarAviso('Erro ao ler arquivo!', 'error');
    };
    reader.readAsDataURL(arquivo);
}

function carregarArquivosContratos() {
    db.ref('contratos').once('value', (snapshot) => {
        const data = snapshot.val();
        contratosMap = data || {};
    }).catch(err => {
        console.error('Erro ao carregar contratos:', err.message);
        contratosMap = {};
    });
}

function atualizarListaSubcategorias() {
    const categoriaSelecionada = document.getElementById('categoriaProduto').value;
    const selectSubcategoria = document.getElementById('subcategoriaProduto');
    const placaVideoGroup = document.getElementById('placaVideoGroup');
    selectSubcategoria.innerHTML = '<option value="">Selecione a subcategoria...</option>';

    if (categoriaSelecionada === 'Notebooks') {
        placaVideoGroup.style.display = 'block';
    } else {
        placaVideoGroup.style.display = 'none';
        document.getElementById('temPlacaVideo').checked = false;
    }

    if (categoriaSelecionada && CATEGORIAS[categoriaSelecionada]) {
        const subcategorias = CATEGORIAS[categoriaSelecionada];
        if (typeof subcategorias === 'object' && subcategorias !== null && Object.keys(subcategorias).length > 0) {
            Object.keys(subcategorias).forEach(sub => {
                const option = document.createElement('option');
                option.value = sub;
                option.textContent = sub;
                selectSubcategoria.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = categoriaSelecionada;
            option.textContent = categoriaSelecionada;
            selectSubcategoria.appendChild(option);
        }
    }
}

function preencherListaCategorias() {
    const selectCategoria = document.getElementById('categoriaProduto');
    if (!selectCategoria) return;
    selectCategoria.innerHTML = '<option value="">Selecione a categoria...</option>';
    Object.keys(CATEGORIAS).forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        selectCategoria.appendChild(option);
    });
}

function renderizarFiltrosCategorias() {
    const container = document.getElementById('categoriasFilter');
    if (!container) return;
    let html = '<div class="categoria-filter">';
    html += '<button class="categoria-btn" onclick="filtrarPorCategoria(null)" id="btnTodas">Todas</button>';
    Object.keys(CATEGORIAS).forEach(cat => {
        html += `<button class="categoria-btn" onclick="filtrarPorCategoria('${cat}')">${cat}</button>`;
    });
    html += '</div>';
    container.innerHTML = html;
    const btnTodas = document.getElementById('btnTodas');
    if (btnTodas) btnTodas.classList.add('active');
}

function renderizarSubcategoriasFiltro() {
    const container = document.getElementById('subcategoriasFilter');
    const sectionContainer = document.getElementById('subcategoriasFilterSection');
    if (!container || !sectionContainer) return;

    if (!categoriaAtiva) {
        sectionContainer.style.display = 'none';
        subcategoriaAtiva = null;
        renderizarFiltroPlaca();
        return;
    }

    sectionContainer.style.display = 'block';
    const subcategorias = CATEGORIAS[categoriaAtiva];

    if (typeof subcategorias !== 'object' || subcategorias === null || Object.keys(subcategorias).length === 0) {
        sectionContainer.style.display = 'none';
        renderizarFiltroPlaca();
        return;
    }

    let html = '<div class="subcategoria-filter">';
    html += '<button class="subcategoria-btn" onclick="filtrarPorSubcategoria(null)"><span class="subcategoria-btn-titulo">Todas</span></button>';
    Object.keys(subcategorias).forEach(sub => {
        const notebooksComSubcategoria = produtos.filter(p => p.categoria === categoriaAtiva && p.subcategoria === sub);
        const temPlacaVideo = notebooksComSubcategoria.some(p => p.temPlacaVideo);
        const specs = categoriaAtiva === 'Notebooks' && temPlacaVideo ? 'Com GPU' : '';
        html += `<button class="subcategoria-btn" onclick="filtrarPorSubcategoria('${sub}')"><span class="subcategoria-btn-titulo">${sub}</span>${specs ? `<span class="subcategoria-btn-specs">${specs}</span>` : ''}</button>`;
    });
    html += '</div>';
    container.innerHTML = html;

    const firstBtn = container.querySelector('.subcategoria-btn');
    if (firstBtn) firstBtn.classList.add('active');
    renderizarFiltroPlaca();
}

function renderizarFiltroPlaca() {
    const container = document.getElementById('placaVideoFilter');
    const sectionContainer = document.getElementById('placaVideoFilterSection');
    if (!container || !sectionContainer) return;

    if (categoriaAtiva !== 'Notebooks') {
        sectionContainer.style.display = 'none';
        filtroPlacaVideo = null;
        return;
    }

    sectionContainer.style.display = 'block';
    container.innerHTML = `
        <button class="placa-video-btn active" onclick="filtrarPorPlacaVideo(null)">Todos</button>
        <button class="placa-video-btn" onclick="filtrarPorPlacaVideo(true)">Com placa</button>
        <button class="placa-video-btn" onclick="filtrarPorPlacaVideo(false)">Sem placa</button>
    `;
}

function filtrarPorCategoria(categoria) {
    categoriaAtiva = categoria;
    subcategoriaAtiva = null;
    filtroPlacaVideo = null;

    document.querySelectorAll('.categoria-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        const btn = event.target.closest('button');
        if (btn) btn.classList.add('active');
    } else if (categoria === null) {
        const btn = document.getElementById('btnTodas');
        if (btn) btn.classList.add('active');
    }

    renderizarSubcategoriasFiltro();
    renderizarEquipamentos();
}

function filtrarPorSubcategoria(subcategoria) {
    subcategoriaAtiva = subcategoria;
    filtroPlacaVideo = null;

    document.querySelectorAll('.subcategoria-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        const btn = event.target.closest('button');
        if (btn) btn.classList.add('active');
    }

    renderizarFiltroPlaca();
    renderizarEquipamentos();
}

function filtrarPorPlacaVideo(temPlaca) {
    filtroPlacaVideo = temPlaca;
    document.querySelectorAll('.placa-video-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        const btn = event.target.closest('button');
        if (btn) btn.classList.add('active');
    }
    renderizarEquipamentos();
}

function renderizarCategoriasLocacao() {
    const container = document.getElementById('categoriasFilterLocar');
    if (!container) return;
    let html = '<button class="categoria-btn active" onclick="filtrarPorCategoriaLocar(null)">Todas</button>';
    Object.keys(CATEGORIAS).forEach(cat => {
        html += `<button class="categoria-btn" onclick="filtrarPorCategoriaLocar('${cat}')">${cat}</button>`;
    });
    container.innerHTML = html;
}

function renderizarSubcategoriasLocacao() {
    const container = document.getElementById('subcategoriasFilterLocar');
    const sectionContainer = document.getElementById('subcategoriasFilterLocarSection');
    if (!container || !sectionContainer) return;

    if (!categoriaAtivaLocar) {
        sectionContainer.style.display = 'none';
        subcategoriaAtivaLocar = null;
        renderizarFiltroPlacaLocacao();
        return;
    }

    sectionContainer.style.display = 'block';
    const subcategorias = CATEGORIAS[categoriaAtivaLocar];

    if (typeof subcategorias !== 'object' || subcategorias === null || Object.keys(subcategorias).length === 0) {
        sectionContainer.style.display = 'none';
        renderizarFiltroPlacaLocacao();
        return;
    }

    let html = '<button class="subcategoria-btn active" onclick="filtrarPorSubcategoriaLocar(null)"><span class="subcategoria-btn-titulo">Todas</span></button>';
    Object.keys(subcategorias).forEach(sub => {
        const notebooksComSubcategoria = produtos.filter(p => p.categoria === categoriaAtivaLocar && p.subcategoria === sub && p.disponivel);
        const temPlacaVideo = notebooksComSubcategoria.some(p => p.temPlacaVideo);
        const specs = categoriaAtivaLocar === 'Notebooks' && temPlacaVideo ? 'Com GPU' : '';
        html += `<button class="subcategoria-btn" onclick="filtrarPorSubcategoriaLocar('${sub}')"><span class="subcategoria-btn-titulo">${sub}</span>${specs ? `<span class="subcategoria-btn-specs">${specs}</span>` : ''}</button>`;
    });

    container.innerHTML = html;
    renderizarFiltroPlacaLocacao();
}

function renderizarFiltroPlacaLocacao() {
    const container = document.getElementById('placaVideoFilterLocar');
    const sectionContainer = document.getElementById('placaVideoFilterLocarSection');
    if (!container || !sectionContainer) return;

    if (categoriaAtivaLocar !== 'Notebooks') {
        sectionContainer.style.display = 'none';
        filtroPlacaVideoLocar = null;
        return;
    }

    sectionContainer.style.display = 'block';
    container.innerHTML = `
        <button class="placa-video-btn active" onclick="filtrarPorPlacaVideoLocar(null)">Todos</button>
        <button class="placa-video-btn" onclick="filtrarPorPlacaVideoLocar(true)">Com placa</button>
        <button class="placa-video-btn" onclick="filtrarPorPlacaVideoLocar(false)">Sem placa</button>
    `;
}

function filtrarPorCategoriaLocar(categoria) {
    categoriaAtivaLocar = categoria;
    subcategoriaAtivaLocar = null;
    filtroPlacaVideoLocar = null;

    document.querySelectorAll('#categoriasFilterLocar .categoria-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        const btn = event.target.closest('button');
        if (btn) btn.classList.add('active');
    }

    renderizarSubcategoriasLocacao();
    renderizarEquipamentosLocar();
}

function filtrarPorSubcategoriaLocar(subcategoria) {
    subcategoriaAtivaLocar = subcategoria;
    filtroPlacaVideoLocar = null;

    document.querySelectorAll('#subcategoriasFilterLocar .subcategoria-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        const btn = event.target.closest('button');
        if (btn) btn.classList.add('active');
    }

    renderizarFiltroPlacaLocacao();
    renderizarEquipamentosLocar();
}

function filtrarPorPlacaVideoLocar(temPlaca) {
    filtroPlacaVideoLocar = temPlaca;
    document.querySelectorAll('#placaVideoFilterLocar .placa-video-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        const btn = event.target.closest('button');
        if (btn) btn.classList.add('active');
    }
    renderizarEquipamentosLocar();
}

function entrarSistema() {
    const campoSenha = document.getElementById('senhaOperador');
    const senha = campoSenha ? campoSenha.value : '';

    if (senha === SENHA_PADRAO) {
        operadorAutenticado = true;
        sessionStorage.setItem('operadorAutenticado', 'true');
        aplicarEstadoLogin();
        if (campoSenha) campoSenha.value = '';
        mostrarAviso('Login realizado com sucesso.');
    } else {
        mostrarAviso('Senha incorreta.', 'error');
    }
}

function sairSistema() {
    if (confirm('Tem certeza que deseja sair?')) {
        operadorAutenticado = false;
        sessionStorage.removeItem('operadorAutenticado');
        aplicarEstadoLogin();
        const campoSenha = document.getElementById('senhaOperador');
        if (campoSenha) {
            campoSenha.value = '';
            campoSenha.focus();
        }
        window.scrollTo(0, 0);
        mostrarAviso('Sessao encerrada.');
    }
}

function aplicarEstadoLogin() {
    const loginScreen = document.getElementById('loginScreen');
    const mainHeader = document.getElementById('mainHeader');

    if (operadorAutenticado) {
        if (loginScreen) loginScreen.style.display = 'none';
        if (mainHeader) mainHeader.style.display = 'flex';
        return;
    }

    if (mainHeader) mainHeader.style.display = 'none';
    if (loginScreen) loginScreen.style.display = 'flex';
}

function abrirModalProduto() {
    const form = document.getElementById('formProduct');
    if (form) form.reset();
    const placaGroup = document.getElementById('placaVideoGroup');
    if (placaGroup) placaGroup.style.display = 'none';
    preencherListaCategorias();
    abrirModal('modalAddProduct');
}

adicionarEvento('formProduct', 'submit', function(e) {
    e.preventDefault();

    const categoria = document.getElementById('categoriaProduto').value;
    const subcategoria = document.getElementById('subcategoriaProduto').value;
    const temPlacaVideo = document.getElementById('temPlacaVideo').checked;

    const produto = {
        id: Date.now().toString(),
        nome: document.getElementById('nomeProduto').value,
        serie: document.getElementById('serieProduto').value,
        descricao: document.getElementById('descricaoProduto').value,
        categoria: categoria,
        subcategoria: subcategoria,
        temPlacaVideo: categoria === 'Notebooks' ? temPlacaVideo : null,
        disponivel: true,
        locacaoId: null
    };

    salvarProduto(produto);
    document.getElementById('formProduct').reset();
    fecharModal('modalAddProduct');
});

function renderizarEquipamentos() {
    const container = document.getElementById('equipamentosList');
    if (!container) return;

    let produtosFiltrados = produtos;
    if (categoriaAtiva) produtosFiltrados = produtosFiltrados.filter(p => p.categoria === categoriaAtiva);
    if (subcategoriaAtiva) produtosFiltrados = produtosFiltrados.filter(p => p.subcategoria === subcategoriaAtiva);
    if (filtroPlacaVideo !== null) produtosFiltrados = produtosFiltrados.filter(p => p.temPlacaVideo === filtroPlacaVideo);

    if (produtosFiltrados.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum equipamento nesta categoria</div>';
        return;
    }

    let html = '<div class="equipamentos-grid">';
    produtosFiltrados.forEach(p => {
        const status = p.disponivel ? 'badge-available' : 'badge-occupied';
        const statusText = p.disponivel ? 'Disponivel' : 'Locado';
        let specs = '';
        if (p.categoria === 'Notebooks') {
            specs = p.temPlacaVideo
                ? '<div class="product-specs"><span class="com-placa">Com placa dedicada</span></div>'
                : '<div class="product-specs"><span class="sem-placa">Sem placa dedicada</span></div>';
        }
        html += `
            <div class="product-card" onclick="verDetalheProduto('${p.id}')">
                <span class="badge ${status}" style="position: absolute; top: 10px; right: 10px;">${statusText}</span>
                ${p.categoria ? `<div class="product-categoria">${p.categoria}${p.subcategoria ? ' / ' + p.subcategoria : ''}</div>` : ''}
                ${specs}
                <h3>${p.nome}</h3>
                <div class="product-serie">${p.serie}</div>
                ${p.descricao ? `<p style="font-size: 12px; color: #a7a9a9; margin-top: 10px;">${p.descricao}</p>` : ''}
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
    const detalhes = document.getElementById('produtoDetalhes');
    if (detalhes) detalhes.innerHTML = '';
}

function renderizarEquipamentosLocar() {
    const container = document.getElementById('equipamentosLocarGrid');
    if (!container) return;

    let produtosFiltrados = produtos.filter(p => p.disponivel);
    if (categoriaAtivaLocar) produtosFiltrados = produtosFiltrados.filter(p => p.categoria === categoriaAtivaLocar);
    if (subcategoriaAtivaLocar) produtosFiltrados = produtosFiltrados.filter(p => p.subcategoria === subcategoriaAtivaLocar);
    if (filtroPlacaVideoLocar !== null) produtosFiltrados = produtosFiltrados.filter(p => p.temPlacaVideo === filtroPlacaVideoLocar);

    if (produtosFiltrados.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum equipamento disponivel nesta categoria</div>';
        return;
    }

    let html = '<div class="equipamentos-grid">';
    produtosFiltrados.forEach(p => {
        let specs = '';
        if (p.categoria === 'Notebooks') {
            specs = p.temPlacaVideo
                ? '<div class="product-specs"><span class="com-placa">Com placa dedicada</span></div>'
                : '<div class="product-specs"><span class="sem-placa">Sem placa dedicada</span></div>';
        }
        html += `
            <div class="product-card" onclick="abrirLocar('${p.id}', document.getElementById('clienteIdParaLocar').value)" style="cursor: pointer;">
                ${p.categoria ? `<div class="product-categoria">${p.categoria}${p.subcategoria ? ' / ' + p.subcategoria : ''}</div>` : ''}
                ${specs}
                <h3>${p.nome}</h3>
                <div class="product-serie">${p.serie}</div>
                ${p.descricao ? `<p style="font-size: 12px; color: #a7a9a9; margin-top: 10px;">${p.descricao}</p>` : ''}
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function verDetalheProduto(produtoId) {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;

    let locacaoInfo = '';
    if (!produto.disponivel && produto.locacaoId) {
        const locacao = locacoes.find(l => l.id === produto.locacaoId);
        const cliente = locacao ? clientes.find(c => c.id === locacao.clienteId) : null;
        locacaoInfo = `
            <div style="background: rgba(239, 68, 68, 0.15); padding: 10px; border-radius: 8px; margin-top: 10px; border: 1px solid rgba(239, 68, 68, 0.25);">
                <strong>Atualmente com:</strong> ${cliente ? cliente.nome : 'Cliente'}<br>
                <strong>Ate:</strong> ${locacao ? new Date(locacao.dataDevolucao).toLocaleDateString('pt-BR') : '-'}
            </div>
        `;
    }

    let specsDetail = '';
    if (produto.categoria === 'Notebooks') {
        specsDetail = `
            <div class="detail-item">
                <strong>Placa de Video Dedicada</strong>
                <span>${produto.temPlacaVideo ? 'Sim' : 'Nao (integrada)'}</span>
            </div>
        `;
    }

    const html = `
        <button class="btn btn-secondary back-btn" onclick="voltarEquipamentos()">Voltar</button>
        <div class="produto-detalhes">
            <h2>${produto.nome}</h2>
            ${produto.categoria ? `<div style="color: var(--primary); font-weight: 600; margin-bottom: 16px;">${produto.categoria}${produto.subcategoria ? ' / ' + produto.subcategoria : ''}</div>` : ''}
            <div class="detail-section">
                <h3>Informacoes</h3>
                <div class="detail-item">
                    <strong>Serie</strong>
                    <span>${produto.serie}</span>
                </div>
                <div class="detail-item">
                    <strong>Status</strong>
                    <span>
                        <span class="badge ${produto.disponivel ? 'badge-available' : 'badge-occupied'}">
                            ${produto.disponivel ? 'Disponivel' : 'Locado'}
                        </span>
                    </span>
                </div>
                ${specsDetail}
                ${produto.descricao ? `
                    <div class="detail-item">
                        <strong>Descricao</strong>
                        <span>${produto.descricao}</span>
                    </div>
                ` : ''}
                ${locacaoInfo}
            </div>
            ${produto.disponivel ? `
                <div class="actions">
                    <button class="btn btn-danger" onclick="deletarProduto('${produto.id}')">Excluir</button>
                </div>
            ` : ''}
        </div>
    `;

    document.getElementById('produtoDetalhes').innerHTML = html;
    document.getElementById('equipamentosList').innerHTML = '';
}

function voltarEquipamentos() {
    document.getElementById('produtoDetalhes').innerHTML = '';
    renderizarFiltrosCategorias();
    renderizarSubcategoriasFiltro();
    renderizarEquipamentos();
}

function deletarProduto(produtoId) {
    if (!confirm('Tem certeza?')) return;
    excluirProdutoFirebase(produtoId);
    mostrarAviso('Produto deletado!');
    voltarEquipamentos();
}

function abrirModalCliente() {
    const form = document.getElementById('formClient');
    if (form) form.reset();
    abrirModal('modalAddClient');
}

adicionarEvento('formClient', 'submit', function(e) {
    e.preventDefault();

    const cliente = {
        id: Date.now().toString(),
        nome: document.getElementById('nomeCliente').value,
        email: document.getElementById('emailCliente').value,
        telefone: document.getElementById('telefoneCliente').value,
        endereco: document.getElementById('enderecoCliente').value,
        dataCriacao: new Date().toLocaleDateString('pt-BR')
    };

    salvarCliente(cliente);
    document.getElementById('formClient').reset();
    fecharModal('modalAddClient');
});

function renderizarClientes() {
    const container = document.getElementById('clientesList');
    if (!container) return;

    if (clientes.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum cliente cadastrado</div>';
        return;
    }

    let html = '<div class="clientes-grid">';
    clientes.forEach(c => {
        const equipLocado = locacoes.filter(l => l.clienteId === c.id && l.ativo);
        const temLocacao = equipLocado.length > 0;
        const status = temLocacao ? 'badge-occupied' : 'badge-available';
        const statusText = temLocacao ? 'Com equipamento' : 'Sem equipamento';

        html += `
            <div class="client-card" onclick="verDetalheCliente('${c.id}')">
                <span class="badge ${status}" style="position: absolute; top: 10px; right: 10px;">${statusText}</span>
                <h3>${c.nome}</h3>
                <div class="client-info">${c.email}</div>
                <div class="client-info">${c.telefone}</div>
                <div class="client-info">${c.endereco}</div>
                <div class="client-info" style="font-size: 11px; color: #a7a9a9; margin-top: 8px;">Desde: ${c.dataCriacao}</div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
    const detalhes = document.getElementById('clienteDetalhes');
    if (detalhes) detalhes.innerHTML = '';
}

function verDetalheCliente(clienteId) {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return;

    const equipLocado = locacoes.filter(l => l.clienteId === clienteId && l.ativo);

    let locacoesHtml = '';
    if (equipLocado.length === 0) {
        locacoesHtml = '<p style="color: #a7a9a9; text-align: center;">Sem equipamentos locados no momento</p>';
    } else {
        locacoesHtml = '<div style="display: flex; flex-direction: column; gap: 10px;">';
        equipLocado.forEach(loc => {
            const produto = produtos.find(p => p.id === loc.produtoId);
            locacoesHtml += `
                <div style="background: #f0f4f8; padding: 10px; border-radius: 8px; color: black;">
                    <strong>${produto ? produto.nome : 'Produto'}</strong><br>
                    <small>De: ${new Date(loc.dataLocacao).toLocaleDateString('pt-BR')} ate ${new Date(loc.dataDevolucao).toLocaleDateString('pt-BR')}</small><br>
                    <small style="color: #32c3bb; font-weight: bold;">R$ ${loc.valorTotal.toFixed(2)}</small>
                    <button class="btn btn-success btn-small" onclick="abrirDevolverProduto('${loc.id}')" style="margin-top: 8px; width: 100%;">Devolver</button>
                </div>
            `;
        });
        locacoesHtml += '</div>';
    }

    const html = `
        <button class="btn btn-secondary back-btn" onclick="voltarClientes()">Voltar</button>
        <div class="cliente-detalhes">
            <h2>${cliente.nome}</h2>
            <div class="detail-section">
                <h3>Dados pessoais</h3>
                <div class="detail-item">
                    <strong>Email</strong>
                    <span>${cliente.email}</span>
                </div>
                <div class="detail-item">
                    <strong>Telefone</strong>
                    <span>${cliente.telefone}</span>
                </div>
                <div class="detail-item">
                    <strong>Endereco</strong>
                    <span>${cliente.endereco}</span>
                </div>
            </div>
            <div class="detail-section">
                <h3>Locacoes ativas</h3>
                ${locacoesHtml}
            </div>
            <div class="actions">
                <button class="btn btn-primary" onclick="abrirSelecionarEquipamento('${cliente.id}')">Locar Equipamento</button>
                <button class="btn btn-danger" onclick="deletarCliente('${cliente.id}')">Excluir cliente</button>
            </div>
        </div>
    `;

    document.getElementById('clienteDetalhes').innerHTML = html;
    document.getElementById('clientesList').innerHTML = '';
}

function voltarClientes() {
    document.getElementById('clienteDetalhes').innerHTML = '';
    renderizarClientes();
}

function deletarCliente(clienteId) {
    if (!confirm('Tem certeza?')) return;
    excluirClienteFirebase(clienteId);
    mostrarAviso('Cliente deletado!');
    voltarClientes();
}

function abrirSelecionarEquipamento(clienteId) {
    document.getElementById('clienteIdParaLocar').value = clienteId;

    categoriaAtivaLocar = null;
    subcategoriaAtivaLocar = null;
    filtroPlacaVideoLocar = null;

    renderizarCategoriasLocacao();
    renderizarSubcategoriasLocacao();
    renderizarEquipamentosLocar();

    abrirModal('modalSelecionarEquipamento');
}

function abrirLocar(produtoId, clienteId) {
    const produto = produtos.find(p => p.id === produtoId);
    const cliente = clientes.find(c => c.id === clienteId);
    if (!produto || !cliente) return;

    fecharModal('modalSelecionarEquipamento');

    document.getElementById('produtoIdLocar').value = produtoId;
    document.getElementById('clienteIdLocar').value = clienteId;
    document.getElementById('dataLocacao').valueAsDate = new Date();
    document.getElementById('dataDevolucao').valueAsDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    document.getElementById('valorDiarioLocar').value = '';

    let produtoInfo = `
        <div class="detail-item">
            <strong>Produto</strong>
            <span>${produto.nome}</span>
        </div>
        ${produto.categoria ? `
            <div class="detail-item">
                <strong>Categoria</strong>
                <span>${produto.categoria}${produto.subcategoria ? ' / ' + produto.subcategoria : ''}</span>
            </div>
        ` : ''}
    `;
    if (produto.categoria === 'Notebooks') {
        produtoInfo += `
            <div class="detail-item">
                <strong>Placa de Video Dedicada</strong>
                <span>${produto.temPlacaVideo ? 'Sim' : 'Nao (integrada)'}</span>
            </div>
        `;
    }
    produtoInfo += `
        <div class="detail-item">
            <strong>Serie</strong>
            <span>${produto.serie}</span>
        </div>
    `;

    document.getElementById('produtoLocarInfo').innerHTML = produtoInfo;
    document.getElementById('clienteLocarInfo').innerHTML = `
        <div class="detail-item">
            <strong>Cliente</strong>
            <span>${cliente.nome}</span>
        </div>
        <div class="detail-item">
            <strong>Email</strong>
            <span>${cliente.email}</span>
        </div>
    `;

    calcularValorLocacao();
    abrirModal('modalLocarProduto');
}

function calcularValorLocacao() {
    const dataLocacao = new Date(document.getElementById('dataLocacao').value);
    const dataDevolucao = new Date(document.getElementById('dataDevolucao').value);
    const valorDia = parseFloat(document.getElementById('valorDiarioLocar').value) || 0;

    if (dataLocacao && dataDevolucao && dataDevolucao > dataLocacao) {
        const dias = Math.ceil((dataDevolucao - dataLocacao) / (1000 * 60 * 60 * 24));
        const total = dias * valorDia;
        document.getElementById('diasLocacao').textContent = dias;
        document.getElementById('totalLocar').textContent = `R$ ${total.toFixed(2)}`;
    } else {
        document.getElementById('diasLocacao').textContent = '0';
        document.getElementById('totalLocar').textContent = 'R$ 0,00';
    }
}

adicionarEvento('dataLocacao', 'change', calcularValorLocacao);
adicionarEvento('dataDevolucao', 'change', calcularValorLocacao);
adicionarEvento('valorDiarioLocar', 'input', calcularValorLocacao);

adicionarEvento('formLocar', 'submit', function(e) {
    e.preventDefault();

    const produtoId = document.getElementById('produtoIdLocar').value;
    const clienteId = document.getElementById('clienteIdLocar').value;
    const contratoFile = document.getElementById('contratoFile').files[0];
    const valorDiario = parseFloat(document.getElementById('valorDiarioLocar').value);
    const produto = produtos.find(p => p.id === produtoId);

    if (!produto || isNaN(valorDiario) || valorDiario <= 0) {
        mostrarAviso('Preencha todos os campos, incluindo o valor diario!', 'error');
        return;
    }

    const dataLocacao = new Date(document.getElementById('dataLocacao').value);
    const dataDevolucao = new Date(document.getElementById('dataDevolucao').value);
    const dias = Math.ceil((dataDevolucao - dataLocacao) / (1000 * 60 * 60 * 24));
    const valorTotal = dias * valorDiario;

    const locacao = {
        id: Date.now().toString(),
        produtoId: produtoId,
        clienteId: clienteId,
        dataLocacao: document.getElementById('dataLocacao').value,
        dataDevolucao: document.getElementById('dataDevolucao').value,
        valorDiario: valorDiario,
        valorTotal: valorTotal,
        ativo: true,
        dataDevolucaoReal: null,
        valorFinal: null,
        temContrato: contratoFile ? true : false
    };

    salvarLocacao(locacao);

    if (contratoFile) {
        setTimeout(() => {
            salvarContratoFirebase(locacao.id, contratoFile);
        }, 500);
    }

    produto.disponivel = false;
    produto.locacaoId = locacao.id;
    salvarProduto(produto);

    mostrarAviso('Locacao criada com sucesso!');
    fecharModal('modalLocarProduto');
    document.getElementById('contratoFile').value = '';
    abrirPagina('clientes');
});

function abrirDevolverProduto(locacaoId) {
    const locacao = locacoes.find(l => l.id === locacaoId);
    if (!locacao) return;

    const produto = produtos.find(p => p.id === locacao.produtoId);
    const cliente = clientes.find(c => c.id === locacao.clienteId);
    if (!produto || !cliente) return;

    document.getElementById('locacaoIdDevolver').value = locacaoId;
    document.getElementById('dataDevolucaoReal').valueAsDate = new Date();

    const dias = Math.ceil((new Date(locacao.dataDevolucao) - new Date()) / (1000 * 60 * 60 * 24));
    let multa = 0;
    if (dias < 0) {
        multa = Math.abs(dias) * (locacao.valorDiario * 0.5);
    }

    const valorFinal = locacao.valorTotal + multa;

    document.getElementById('infoDevolver').innerHTML = `
        <div class="detail-section">
            <h3>Produto: ${produto.nome}</h3>
            ${produto.categoria ? `<small>Categoria: ${produto.categoria}${produto.subcategoria ? ' / ' + produto.subcategoria : ''}</small><br>` : ''}
            <small>Serie: ${produto.serie}</small>
        </div>
        <div class="detail-section">
            <h3>Cliente: ${cliente.nome}</h3>
            <small>${cliente.email} | ${cliente.telefone}</small>
        </div>
        <div class="detail-section">
            <strong>Locado em:</strong> ${new Date(locacao.dataLocacao).toLocaleDateString('pt-BR')}<br>
            <strong>Devolucao prevista:</strong> ${new Date(locacao.dataDevolucao).toLocaleDateString('pt-BR')}<br>
            <strong>Valor/Dia contratado:</strong> R$ ${(locacao.valorDiario || 0).toFixed(2)}
        </div>
    `;

    document.getElementById('valorOriginalDevolver').textContent = `R$ ${locacao.valorTotal.toFixed(2)}`;
    document.getElementById('multaDevolver').textContent = `R$ ${multa.toFixed(2)}`;
    document.getElementById('totalPagarDevolver').textContent = `R$ ${valorFinal.toFixed(2)}`;

    abrirModal('modalDevolverProduto');
}

adicionarEvento('formDevolver', 'submit', function(e) {
    e.preventDefault();

    const locacaoId = document.getElementById('locacaoIdDevolver').value;
    const locacao = locacoes.find(l => l.id === locacaoId);
    if (!locacao) return;
    const produto = produtos.find(p => p.id === locacao.produtoId);
    if (!produto) return;

    const dias = Math.ceil((new Date(locacao.dataDevolucao) - new Date()) / (1000 * 60 * 60 * 24));
    let multa = 0;
    if (dias < 0) {
        multa = Math.abs(dias) * (locacao.valorDiario * 0.5);
    }

    locacao.ativo = false;
    locacao.dataDevolucaoReal = document.getElementById('dataDevolucaoReal').value;
    locacao.condicao = document.getElementById('condicao').value;
    locacao.valorFinal = locacao.valorTotal + multa;

    salvarLocacao(locacao);

    produto.disponivel = true;
    produto.locacaoId = null;
    salvarProduto(produto);

    mostrarAviso('Produto devolvido!');
    fecharModal('modalDevolverProduto');
});

function atualizarPainel() {
    const totalClientesEl = document.getElementById('totalClientes');
    if (!totalClientesEl) return;

    totalClientesEl.textContent = clientes.length;
    document.getElementById('equipAtivos').textContent = locacoes.filter(l => l.ativo).length;
    document.getElementById('equipLivres').textContent = produtos.filter(p => p.disponivel).length;

    const valorTotal = locacoes.filter(l => l.ativo).reduce((sum, l) => sum + l.valorTotal, 0);
    document.getElementById('valorTotal').textContent = `R$ ${valorTotal.toFixed(2)}`;

    const container = document.getElementById('locacoesAtivas');
    if (!container) return;
    const ativas = locacoes.filter(l => l.ativo);

    if (ativas.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhuma locacao ativa</div>';
    } else {
        let html = '<table><thead><tr><th>Equipamento</th><th>Cliente</th><th>Valor/Dia</th><th>Devolucao</th><th>Total</th><th>Contrato</th><th>Acao</th></tr></thead><tbody>';
        ativas.forEach(loc => {
            const produto = produtos.find(p => p.id === loc.produtoId);
            const cliente = clientes.find(c => c.id === loc.clienteId);
            if (!produto || !cliente) return;
            const dias = Math.ceil((new Date(loc.dataDevolucao) - new Date()) / (1000 * 60 * 60 * 24));
            const badge = dias < 0 ? 'badge-occupied' : 'badge-available';
            const temContrato = contratosMap && contratosMap[loc.id];
            const botaoContrato = temContrato
                ? `<button class="btn btn-info btn-small" onclick="baixarContrato('${loc.id}')">Download</button>`
                : `<button class="btn btn-secondary btn-small" onclick="abrirAdicionarContrato('${loc.id}')">Adicionar</button>`;

            html += `<tr class="clickable" onclick="abrirDetalhesLocacao('${loc.id}')">
                <td><strong>${produto.nome}</strong></td>
                <td>${cliente.nome}</td>
                <td>R$ ${(loc.valorDiario || 0).toFixed(2)}</td>
                <td>${new Date(loc.dataDevolucao).toLocaleDateString('pt-BR')} <span class="badge ${badge}">${dias}d</span></td>
                <td>R$ ${loc.valorTotal.toFixed(2)}</td>
                <td><div onclick="event.stopPropagation();">${botaoContrato}</div></td>
                <td><div onclick="event.stopPropagation();"><button class="btn btn-success btn-small" onclick="abrirDevolverProduto('${loc.id}')">Devolver</button></div></td>
            </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    }

    document.getElementById('locacaoDetalhes').innerHTML = '';
}

function abrirDetalhesLocacao(locacaoId) {
    const locacao = locacoes.find(l => l.id === locacaoId);
    if (!locacao) return;

    const produto = produtos.find(p => p.id === locacao.produtoId);
    const cliente = clientes.find(c => c.id === locacao.clienteId);
    if (!produto || !cliente) return;

    const dias = Math.ceil((new Date(locacao.dataDevolucao) - new Date()) / (1000 * 60 * 60 * 24));
    let multa = 0;
    if (dias < 0) {
        multa = Math.abs(dias) * (locacao.valorDiario * 0.5);
    }

    let produtoSpecs = '';
    if (produto.categoria === 'Notebooks') {
        produtoSpecs = `
            <div class="detail-item">
                <strong>Placa de Video Dedicada</strong>
                <span>${produto.temPlacaVideo ? 'Sim' : 'Nao (integrada)'}</span>
            </div>
        `;
    }

    const html = `
        <button class="btn btn-secondary back-btn" onclick="voltarDashboard()">Voltar</button>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <div class="detail-section">
                <h3>Informacoes do equipamento</h3>
                <div class="detail-item">
                    <strong>Nome</strong>
                    <span>${produto.nome}</span>
                </div>
                ${produto.categoria ? `
                    <div class="detail-item">
                        <strong>Categoria</strong>
                        <span>${produto.categoria}${produto.subcategoria ? ' / ' + produto.subcategoria : ''}</span>
                    </div>
                ` : ''}
                <div class="detail-item">
                    <strong>Serie</strong>
                    <span>${produto.serie}</span>
                </div>
                ${produto.descricao ? `
                    <div class="detail-item">
                        <strong>Descricao</strong>
                        <span>${produto.descricao}</span>
                    </div>
                ` : ''}
                ${produtoSpecs}
            </div>
            <div class="detail-section">
                <h3>Informacoes do cliente</h3>
                <div class="detail-item">
                    <strong>Nome</strong>
                    <span>${cliente.nome}</span>
                </div>
                <div class="detail-item">
                    <strong>Email</strong>
                    <span>${cliente.email}</span>
                </div>
                <div class="detail-item">
                    <strong>Telefone</strong>
                    <span>${cliente.telefone}</span>
                </div>
                <div class="detail-item">
                    <strong>Endereco</strong>
                    <span>${cliente.endereco}</span>
                </div>
            </div>
        </div>
        <div class="detail-section">
            <h3>Datas e valores</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px;">
                <div class="detail-item">
                    <strong>Data Locacao</strong>
                    <span>${new Date(locacao.dataLocacao).toLocaleDateString('pt-BR')}</span>
                </div>
                <div class="detail-item">
                    <strong>Data Devolucao</strong>
                    <span>${new Date(locacao.dataDevolucao).toLocaleDateString('pt-BR')}</span>
                </div>
                <div class="detail-item">
                    <strong>Dias Restantes</strong>
                    <span style="color: ${dias < 0 ? 'var(--danger)' : 'var(--success)'}; font-weight: bold;">${dias}d</span>
                </div>
                <div class="detail-item">
                    <strong>Valor/Dia</strong>
                    <span>R$ ${(locacao.valorDiario || 0).toFixed(2)}</span>
                </div>
            </div>
        </div>
        <div class="detail-section">
            <h3>Valores</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                <div class="detail-item">
                    <strong>Valor Total</strong>
                    <span style="color: var(--primary); font-weight: bold; font-size: 16px;">R$ ${locacao.valorTotal.toFixed(2)}</span>
                </div>
                <div class="detail-item">
                    <strong>Multa Estimada</strong>
                    <span style="color: var(--danger); font-weight: bold; font-size: 16px;">R$ ${multa.toFixed(2)}</span>
                </div>
                <div class="detail-item">
                    <strong>Total Estimado</strong>
                    <span style="color: var(--primary); font-weight: bold; font-size: 16px;">R$ ${(locacao.valorTotal + multa).toFixed(2)}</span>
                </div>
            </div>
        </div>
        <div class="actions">
            <button class="btn btn-success" onclick="abrirDevolverProduto('${locacao.id}')">Devolver Equipamento</button>
        </div>
    `;

    document.getElementById('locacaoDetalhes').innerHTML = html;
    document.getElementById('locacoesAtivas').innerHTML = '';
}

function voltarDashboard() {
    document.getElementById('locacaoDetalhes').innerHTML = '';
    atualizarPainel();
}

function renderizarHistorico() {
    const container = document.getElementById('historicoList');
    if (!container) return;
    const devolvidas = locacoes.filter(l => !l.ativo);

    if (devolvidas.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhuma devolucao registrada</div>';
        return;
    }

    let html = '<div style="overflow-x: auto;"><table><thead><tr><th>Equipamento</th><th>Cliente</th><th>Locacao</th><th>Devolucao</th><th>Valor/Dia</th><th>Total</th><th>Condicao</th><th>Contrato</th></tr></thead><tbody>';
    devolvidas.forEach(loc => {
        const produto = produtos.find(p => p.id === loc.produtoId);
        const cliente = clientes.find(c => c.id === loc.clienteId);
        const botaoContrato = contratosMap && contratosMap[loc.id]
            ? `<button class="btn btn-info btn-small" onclick="baixarContrato('${loc.id}')">Download</button>`
            : '<span style="color: #a7a9a9;">Sem arquivo</span>';

        html += `<tr>
            <td>${produto ? produto.nome : 'Desconhecido'}</td>
            <td>${cliente ? cliente.nome : 'Desconhecido'}</td>
            <td>${new Date(loc.dataLocacao).toLocaleDateString('pt-BR')}</td>
            <td>${loc.dataDevolucaoReal ? new Date(loc.dataDevolucaoReal).toLocaleDateString('pt-BR') : '-'}</td>
            <td>R$ ${(loc.valorDiario || 0).toFixed(2)}</td>
            <td>R$ ${loc.valorTotal.toFixed(2)}</td>
            <td><span class="badge badge-available">${loc.condicao || '-'}</span></td>
            <td>${botaoContrato}</td>
        </tr>`;
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function filtrarHistorico() {
    const busca = document.getElementById('buscaHistorico').value.toLowerCase();
    const devolvidas = locacoes.filter(l => !l.ativo);
    const container = document.getElementById('historicoList');

    const filtradas = devolvidas.filter(loc => {
        const produto = produtos.find(p => p.id === loc.produtoId);
        const cliente = clientes.find(c => c.id === loc.clienteId);
        const textoProduto = produto ? produto.nome.toLowerCase() : '';
        const textoCliente = cliente ? cliente.nome.toLowerCase() : '';
        return textoProduto.includes(busca) || textoCliente.includes(busca);
    });

    if (filtradas.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum resultado encontrado</div>';
        return;
    }

    let html = '<div style="overflow-x: auto;"><table><thead><tr><th>Equipamento</th><th>Cliente</th><th>Locacao</th><th>Devolucao</th><th>Valor/Dia</th><th>Total</th><th>Condicao</th><th>Contrato</th></tr></thead><tbody>';
    filtradas.forEach(loc => {
        const produto = produtos.find(p => p.id === loc.produtoId);
        const cliente = clientes.find(c => c.id === loc.clienteId);
        const botaoContrato = contratosMap && contratosMap[loc.id]
            ? `<button class="btn btn-info btn-small" onclick="baixarContrato('${loc.id}')">Download</button>`
            : `<button class="btn btn-secondary btn-small" onclick="abrirAdicionarContrato('${loc.id}')">Adicionar</button>`;

        html += `<tr>
            <td>${produto ? produto.nome : 'Desconhecido'}</td>
            <td>${cliente ? cliente.nome : 'Desconhecido'}</td>
            <td>${new Date(loc.dataLocacao).toLocaleDateString('pt-BR')}</td>
            <td>${loc.dataDevolucaoReal ? new Date(loc.dataDevolucaoReal).toLocaleDateString('pt-BR') : '-'}</td>
            <td>R$ ${(loc.valorDiario || 0).toFixed(2)}</td>
            <td>R$ ${loc.valorTotal.toFixed(2)}</td>
            <td><span class="badge badge-available">${loc.condicao || '-'}</span></td>
            <td>${botaoContrato}</td>
        </tr>`;
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function baixarContrato(locacaoId) {
    let contrato = contratosMap[locacaoId];
    if (!contrato) {
        db.ref('contratos/' + locacaoId).once('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                contrato = data;
                contratosMap[locacaoId] = data;
                fazerDownloadContrato(contrato);
            } else {
                mostrarAviso('Contrato nao encontrado!', 'error');
            }
        }).catch(err => {
            console.error('Erro ao buscar contrato:', err.message);
            mostrarAviso('Erro ao buscar contrato!', 'error');
        });
    } else {
        fazerDownloadContrato(contrato);
    }
}

function fazerDownloadContrato(contrato) {
    try {
        const link = document.createElement('a');
        link.href = contrato.data;
        link.download = contrato.nome;
        link.click();
        mostrarAviso('Download iniciado!');
    } catch (err) {
        console.error('Erro ao fazer download:', err.message);
        mostrarAviso('Erro ao fazer download!', 'error');
    }
}

function abrirAdicionarContrato(locacaoId) {
    const locacao = locacoes.find(l => l.id === locacaoId);
    if (!locacao) return;

    const produto = produtos.find(p => p.id === locacao.produtoId);
    const cliente = clientes.find(c => c.id === locacao.clienteId);
    if (!produto || !cliente) return;

    document.getElementById('locacaoIdContrato').value = locacaoId;
    document.getElementById('contratoFileModal').value = '';

    document.getElementById('infoContratoModal').innerHTML = `
        <div class="detail-section">
            <h3>Produto: ${produto.nome}</h3>
            ${produto.categoria ? `<small>Categoria: ${produto.categoria}${produto.subcategoria ? ' / ' + produto.subcategoria : ''}</small><br>` : ''}
            <small>Serie: ${produto.serie}</small>
        </div>
        <div class="detail-section">
            <h3>Cliente: ${cliente.nome}</h3>
            <small>${cliente.email} | ${cliente.telefone}</small>
        </div>
        <div class="detail-section">
            <strong>Locacao:</strong> ${new Date(locacao.dataLocacao).toLocaleDateString('pt-BR')} ate ${new Date(locacao.dataDevolucao).toLocaleDateString('pt-BR')}<br>
        </div>
    `;

    abrirModal('modalAdicionarContrato');
}

adicionarEvento('formAdicionarContrato', 'submit', function(e) {
    e.preventDefault();

    const locacaoId = document.getElementById('locacaoIdContrato').value;
    const contratoFile = document.getElementById('contratoFileModal').files[0];

    if (!contratoFile) {
        mostrarAviso('Selecione um arquivo!', 'error');
        return;
    }

    salvarContratoFirebase(locacaoId, contratoFile);
    fecharModal('modalAdicionarContrato');
    document.getElementById('contratoFileModal').value = '';

    const pagina = document.body.dataset.page;
    if (pagina === 'dashboard') atualizarPainel();
    else if (pagina === 'historico') renderizarHistorico();
});

document.addEventListener('DOMContentLoaded', function() {
    operadorAutenticado = sessionStorage.getItem('operadorAutenticado') === 'true';
    aplicarEstadoLogin();

    if (iniciarFirebase()) {
        carregarDadosFirebase();
        carregarArquivosContratos();
    } else {
        mostrarAviso('Configure o Firebase para carregar os dados.', 'error');
    }

    ativarPaginaAtual();

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) fecharModal(this.id);
        });
    });

    adicionarEvento('senhaOperador', 'keypress', function(e) {
        if (e.key === 'Enter') entrarSistema();
    });
});