// ========== DADOS ==========
let produtos = JSON.parse(localStorage.getItem('produtos')) || [];
let clientes = JSON.parse(localStorage.getItem('clientes')) || [];
let locacoes = JSON.parse(localStorage.getItem('locacoes')) || [];

// ========== FUNÇÕES PRINCIPAIS ==========
function showView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewName).classList.add('active');
    window.scrollTo(0, 0);

    if (viewName === 'dashboard') updateDashboard();
    else if (viewName === 'equipamentos') renderEquipamentos();
    else if (viewName === 'clientes') renderClientes();
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showNotification(msg, type = 'success') {
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = msg;
    notif.style.cssText = `
        position: fixed; top: 20px; right: 20px; 
        background: white; padding: 15px 20px; 
        border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 3000; animation: slideIn 0.3s;
        border-left: 4px solid ${type === 'success' ? '#22c55e' : '#ef4444'};
    `;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

// ========== PRODUTOS ==========
function openAddProductModal() {
    document.getElementById('formProduct').reset();
    openModal('modalAddProduct');
}

document.getElementById('formProduct').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const produto = {
        id: Date.now(),
        nome: document.getElementById('nomeProduto').value,
        serie: document.getElementById('serieProduto').value,
        descricao: document.getElementById('descricaoProduto').value,
        valorDiario: parseFloat(document.getElementById('valorDiarioProduto').value),
        disponivel: true,
        locacaoId: null
    };

    produtos.push(produto);
    localStorage.setItem('produtos', JSON.stringify(produtos));
    showNotification('✓ Produto adicionado!');
    closeModal('modalAddProduct');
    renderEquipamentos();
});

function renderEquipamentos() {
    const container = document.getElementById('equipamentosList');
    
    if (produtos.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum equipamento cadastrado</div>';
        return;
    }

    let html = '<div class="equipamentos-grid">';
    
    produtos.forEach(p => {
        const status = p.disponivel ? 'badge-available' : 'badge-occupied';
        const statusText = p.disponivel ? '✅ Disponível' : '🔴 Locado';
        
        html += `
            <div class="product-card" onclick="verDetalheProduto(${p.id})">
                <span class="badge ${status}" style="position: absolute; top: 10px; right: 10px;">${statusText}</span>
                <h3>${p.nome}</h3>
                <div class="product-serie">📌 ${p.serie}</div>
                <div class="product-valor">R$ ${p.valorDiario.toFixed(2)}/dia</div>
                ${p.descricao ? `<p style="font-size: 12px; color: #666;">${p.descricao}</p>` : ''}
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    document.getElementById('produtoDetalhes').style.display = 'none';
}

function verDetalheProduto(produtoId) {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;

    let locacaoInfo = '';
    if (!produto.disponivel && produto.locacaoId) {
        const locacao = locacoes.find(l => l.id === produto.locacaoId);
        const cliente = clientes.find(c => c.id === locacao.clienteId);
        locacaoInfo = `
            <div style="background: #fee2e2; padding: 10px; border-radius: 8px; margin-top: 10px;">
                <strong>Atualmente com:</strong> ${cliente ? cliente.nome : 'Cliente'}<br>
                <strong>Até:</strong> ${new Date(locacao.dataDevolucao).toLocaleDateString('pt-BR')}
            </div>
        `;
    }

    const html = `
        <button class="btn btn-secondary back-btn" onclick="renderEquipamentos()">← Voltar</button>
        <div class="produto-detalhes">
            <h2>${produto.nome}</h2>
            <div class="detail-section">
                <h3>📦 Informações</h3>
                <div class="detail-item">
                    <strong>Série</strong>
                    <span>${produto.serie}</span>
                </div>
                <div class="detail-item">
                    <strong>Valor Diário</strong>
                    <span>R$ ${produto.valorDiario.toFixed(2)}</span>
                </div>
                <div class="detail-item">
                    <strong>Status</strong>
                    <span>
                        <span class="badge ${produto.disponivel ? 'badge-available' : 'badge-occupied'}">
                            ${produto.disponivel ? '✅ Disponível' : '🔴 Locado'}
                        </span>
                    </span>
                </div>
                ${produto.descricao ? `
                    <div class="detail-item">
                        <strong>Descrição</strong>
                        <span>${produto.descricao}</span>
                    </div>
                ` : ''}
                ${locacaoInfo}
            </div>
            ${produto.disponivel ? `
                <div class="actions">
                    <button class="btn btn-danger" onclick="deletarProduto(${produto.id})">🗑️ Deletar</button>
                </div>
            ` : ''}
        </div>
    `;

    document.getElementById('produtoDetalhes').innerHTML = html;
    document.getElementById('produtoDetalhes').style.display = 'block';
    document.getElementById('equipamentosList').style.display = 'none';
}

function deletarProduto(produtoId) {
    if (!confirm('Tem certeza?')) return;
    produtos = produtos.filter(p => p.id !== produtoId);
    localStorage.setItem('produtos', JSON.stringify(produtos));
    showNotification('✓ Produto deletado!');
    renderEquipamentos();
}

// ========== CLIENTES ==========
function openAddClientModal() {
    document.getElementById('formClient').reset();
    openModal('modalAddClient');
}

document.getElementById('formClient').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const cliente = {
        id: Date.now(),
        nome: document.getElementById('nomeCliente').value,
        email: document.getElementById('emailCliente').value,
        telefone: document.getElementById('telefoneCliente').value,
        endereco: document.getElementById('enderecoCliente').value,
        dataCriacao: new Date().toLocaleDateString('pt-BR')
    };

    clientes.push(cliente);
    localStorage.setItem('clientes', JSON.stringify(clientes));
    showNotification('✓ Cliente adicionado!');
    closeModal('modalAddClient');
    renderClientes();
});

function renderClientes() {
    const container = document.getElementById('clientesList');
    
    if (clientes.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum cliente cadastrado</div>';
        return;
    }

    let html = '<div class="clientes-grid">';
    
    clientes.forEach(c => {
        const equipLocado = locacoes.filter(l => l.clienteId === c.id && l.ativo);
        const temLocacao = equipLocado.length > 0;
        const status = temLocacao ? 'badge-occupied' : 'badge-available';
        const statusText = temLocacao ? '🔴 Com equipamento' : '✅ Sem equipamento';
        
        html += `
            <div class="client-card" onclick="verDetalheCliente(${c.id})">
                <span class="badge ${status}" style="position: absolute; top: 10px; right: 10px;">${statusText}</span>
                <h3>${c.nome}</h3>
                <div class="client-info">📧 ${c.email}</div>
                <div class="client-info">📱 ${c.telefone}</div>
                <div class="client-info">📍 ${c.endereco}</div>
                <div class="client-info" style="font-size: 11px; color: #999; margin-top: 8px;">Desde: ${c.dataCriacao}</div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    document.getElementById('clienteDetalhes').style.display = 'none';
}

function verDetalheCliente(clienteId) {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return;

    const equipLocado = locacoes.filter(l => l.clienteId === clienteId && l.ativo);
    
    let locacoesHtml = '';
    if (equipLocado.length === 0) {
        locacoesHtml = '<p style="color: #666; text-align: center;">Sem equipamentos locados no momento</p>';
    } else {
        locacoesHtml = '<div style="display: flex; flex-direction: column; gap: 10px;">';
        equipLocado.forEach(loc => {
            const produto = produtos.find(p => p.id === loc.produtoId);
            locacoesHtml += `
                <div style="background: #f0f4f8; padding: 10px; border-radius: 8px;">
                    <strong>${produto ? produto.nome : 'Produto'}</strong><br>
                    <small>De: ${new Date(loc.dataLocacao).toLocaleDateString('pt-BR')} até ${new Date(loc.dataDevolucao).toLocaleDateString('pt-BR')}</small><br>
                    <small style="color: var(--primary); font-weight: bold;">R$ ${loc.valorTotal.toFixed(2)}</small>
                    <button class="btn btn-success btn-small" onclick="abrirDevolverProduto(${loc.id})" style="margin-top: 8px; width: 100%;">✓ Devolver</button>
                </div>
            `;
        });
        locacoesHtml += '</div>';
    }

    const html = `
        <button class="btn btn-secondary back-btn" onclick="renderClientes()">← Voltar</button>
        <div class="cliente-detalhes">
            <h2>${cliente.nome}</h2>
            <div class="detail-section">
                <h3>👤 Dados Pessoais</h3>
                <div class="detail-item">
                    <strong>Email</strong>
                    <span>${cliente.email}</span>
                </div>
                <div class="detail-item">
                    <strong>Telefone</strong>
                    <span>${cliente.telefone}</span>
                </div>
                <div class="detail-item">
                    <strong>Endereço</strong>
                    <span>${cliente.endereco}</span>
                </div>
            </div>

            <div class="detail-section">
                <h3>📦 Locações Ativas</h3>
                ${locacoesHtml}
            </div>

            <div class="actions">
                <button class="btn btn-primary" onclick="abrirLocarProdutoCliente(${cliente.id})">➕ Locar Equipamento</button>
                <button class="btn btn-danger" onclick="deletarCliente(${cliente.id})">🗑️ Deletar Cliente</button>
            </div>
        </div>
    `;

    document.getElementById('clienteDetalhes').innerHTML = html;
    document.getElementById('clienteDetalhes').style.display = 'block';
    document.getElementById('clientesList').style.display = 'none';
}

function deletarCliente(clienteId) {
    if (!confirm('Tem certeza?')) return;
    clientes = clientes.filter(c => c.id !== clienteId);
    localStorage.setItem('clientes', JSON.stringify(clientes));
    showNotification('✓ Cliente deletado!');
    renderClientes();
}

// ========== LOCAÇÕES ==========
function abrirLocarProdutoCliente(clienteId) {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return;

    const html = `
        <div style="margin-bottom: 20px;">
            <h3>Selecione um Equipamento</h3>
            <div class="equipamentos-grid" style="margin-top: 15px;">
                ${produtos.filter(p => p.disponivel).map(p => `
                    <div class="product-card" onclick="abrirLocar(${p.id}, ${clienteId})">
                        <h3>${p.nome}</h3>
                        <div class="product-serie">📌 ${p.serie}</div>
                        <div class="product-valor">R$ ${p.valorDiario.toFixed(2)}/dia</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    document.getElementById('clienteDetalhes').innerHTML = html;
}

function abrirLocar(produtoId, clienteId) {
    const produto = produtos.find(p => p.id === produtoId);
    const cliente = clientes.find(c => c.id === clienteId);

    if (!produto || !cliente) return;

    document.getElementById('produtoIdLocar').value = produtoId;
    document.getElementById('clienteIdLocar').value = clienteId;
    document.getElementById('dataLocacao').valueAsDate = new Date();
    document.getElementById('dataDevolucao').valueAsDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    document.getElementById('produtoLocarInfo').innerHTML = `
        <div class="detail-item">
            <strong>Produto</strong>
            <span>${produto.nome}</span>
        </div>
        <div class="detail-item">
            <strong>Série</strong>
            <span>${produto.serie}</span>
        </div>
        <div class="detail-item">
            <strong>Valor/Dia</strong>
            <span>R$ ${produto.valorDiario.toFixed(2)}</span>
        </div>
    `;

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
    openModal('modalLocarProduto');
}

function calcularValorLocacao() {
    const dataLocacao = new Date(document.getElementById('dataLocacao').value);
    const dataDevolucao = new Date(document.getElementById('dataDevolucao').value);
    const valorDia = parseFloat(document.getElementById('valorDiaLocar').dataset.valor) || 0;

    if (dataLocacao && dataDevolucao && dataDevolucao > dataLocacao) {
        const dias = Math.ceil((dataDevolucao - dataLocacao) / (1000 * 60 * 60 * 24));
        const total = dias * valorDia;

        document.getElementById('diasLocacao').textContent = dias;
        document.getElementById('totalLocar').textContent = `R$ ${total.toFixed(2)}`;
    }
}

document.getElementById('dataLocacao').addEventListener('change', calcularValorLocacao);
document.getElementById('dataDevolucao').addEventListener('change', calcularValorLocacao);

document.getElementById('formLocar').addEventListener('submit', function(e) {
    e.preventDefault();

    const produtoId = parseInt(document.getElementById('produtoIdLocar').value);
    const clienteId = parseInt(document.getElementById('clienteIdLocar').value);
    const produto = produtos.find(p => p.id === produtoId);

    if (!produto) return;

    const dataLocacao = new Date(document.getElementById('dataLocacao').value);
    const dataDevolucao = new Date(document.getElementById('dataDevolucao').value);
    const dias = Math.ceil((dataDevolucao - dataLocacao) / (1000 * 60 * 60 * 24));
    const valorTotal = dias * produto.valorDiario;

    const locacao = {
        id: Date.now(),
        produtoId: produtoId,
        clienteId: clienteId,
        dataLocacao: document.getElementById('dataLocacao').value,
        dataDevolucao: document.getElementById('dataDevolucao').value,
        valorTotal: valorTotal,
        ativo: true,
        dataDevolucaoReal: null,
        valorFinal: null
    };

    locacoes.push(locacao);
    produto.disponivel = false;
    produto.locacaoId = locacao.id;

    localStorage.setItem('locacoes', JSON.stringify(locacoes));
    localStorage.setItem('produtos', JSON.stringify(produtos));

    showNotification('✓ Locação criada!');
    closeModal('modalLocarProduto');
    verDetalheCliente(clienteId);
    updateDashboard();
});

function abrirDevolverProduto(locacaoId) {
    const locacao = locacoes.find(l => l.id === locacaoId);
    if (!locacao) return;

    const produto = produtos.find(p => p.id === locacao.produtoId);
    const cliente = clientes.find(c => c.id === locacao.clienteId);

    document.getElementById('locacaoIdDevolver').value = locacaoId;
    document.getElementById('dataDevolucaoReal').valueAsDate = new Date();

    const dias = Math.ceil((new Date(locacao.dataDevolucao) - new Date()) / (1000 * 60 * 60 * 24));
    let multa = 0;
    if (dias < 0) {
        multa = Math.abs(dias) * (produto.valorDiario * 0.5);
    }

    const valorFinal = locacao.valorTotal + multa;

    document.getElementById('infoDevolver').innerHTML = `
        <div class="detail-section">
            <h3>📦 Produto: ${produto.nome}</h3>
            <small>Série: ${produto.serie}</small>
        </div>
        <div class="detail-section">
            <h3>👤 Cliente: ${cliente.nome}</h3>
            <small>${cliente.email} | ${cliente.telefone}</small>
        </div>
        <div class="detail-section">
            <strong>Locado em:</strong> ${new Date(locacao.dataLocacao).toLocaleDateString('pt-BR')}<br>
            <strong>Devolução prevista:</strong> ${new Date(locacao.dataDevolucao).toLocaleDateString('pt-BR')}
        </div>
    `;

    document.getElementById('valorOriginalDevolver').textContent = `R$ ${locacao.valorTotal.toFixed(2)}`;
    document.getElementById('multaDevolver').textContent = `R$ ${multa.toFixed(2)}`;
    document.getElementById('totalPagarDevolver').textContent = `R$ ${valorFinal.toFixed(2)}`;

    openModal('modalDevolverProduto');
}

document.getElementById('formDevolver').addEventListener('submit', function(e) {
    e.preventDefault();

    const locacaoId = parseInt(document.getElementById('locacaoIdDevolver').value);
    const locacao = locacoes.find(l => l.id === locacaoId);
    const produto = produtos.find(p => p.id === locacao.produtoId);

    const dias = Math.ceil((new Date(locacao.dataDevolucao) - new Date()) / (1000 * 60 * 60 * 24));
    let multa = 0;
    if (dias < 0) {
        multa = Math.abs(dias) * (produto.valorDiario * 0.5);
    }

    locacao.ativo = false;
    locacao.dataDevolucaoReal = document.getElementById('dataDevolucaoReal').value;
    locacao.condicao = document.getElementById('condicao').value;
    locacao.valorFinal = locacao.valorTotal + multa;

    produto.disponivel = true;
    produto.locacaoId = null;

    localStorage.setItem('locacoes', JSON.stringify(locacoes));
    localStorage.setItem('produtos', JSON.stringify(produtos));

    showNotification('✓ Produto devolvido!');
    closeModal('modalDevolverProduto');
    updateDashboard();
    renderEquipamentos();
    renderClientes();
});

// ========== DASHBOARD ==========
function updateDashboard() {
    document.getElementById('totalClientes').textContent = clientes.length;
    document.getElementById('equipAtivos').textContent = locacoes.filter(l => l.ativo).length;
    document.getElementById('equipLivres').textContent = produtos.filter(p => p.disponivel).length;

    const valorTotal = locacoes
        .filter(l => l.ativo)
        .reduce((sum, l) => sum + l.valorTotal, 0);
    
    document.getElementById('valorTotal').textContent = `R$ ${valorTotal.toFixed(2)}`;

    const container = document.getElementById('locacoesAtivas');
    const ativas = locacoes.filter(l => l.ativo);

    if (ativas.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhuma locação ativa</div>';
        return;
    }

    let html = '<table><thead><tr><th>Equipamento</th><th>Cliente</th><th>Devolução</th><th>Valor</th><th>Ações</th></tr></thead><tbody>';

    ativas.forEach(loc => {
        const produto = produtos.find(p => p.id === loc.produtoId);
        const cliente = clientes.find(c => c.id === loc.clienteId);
        const dias = Math.ceil((new Date(loc.dataDevolucao) - new Date()) / (1000 * 60 * 60 * 24));
        const badge = dias < 0 ? 'badge-occupied' : 'badge-available';

        html += `<tr>
            <td><strong>${produto.nome}</strong></td>
            <td>${cliente.nome}</td>
            <td>${new Date(loc.dataDevolucao).toLocaleDateString('pt-BR')} <span class="badge ${badge}">${dias}d</span></td>
            <td>R$ ${loc.valorTotal.toFixed(2)}</td>
            <td><button class="btn btn-success btn-small" onclick="abrirDevolverProduto(${loc.id})">Devolver</button></td>
        </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', function() {
    updateDashboard();
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeModal(this.id);
        });
    });

    // Preencher valor diário ao abrir modal
    document.getElementById('dataLocacao').addEventListener('change', function() {
        const produtoId = parseInt(document.getElementById('produtoIdLocar').value);
        const produto = produtos.find(p => p.id === produtoId);
        if (produto) {
            document.getElementById('valorDiaLocar').textContent = `R$ ${produto.valorDiario.toFixed(2)}`;
            document.getElementById('valorDiaLocar').dataset.valor = produto.valorDiario;
            calcularValorLocacao();
        }
    });
});