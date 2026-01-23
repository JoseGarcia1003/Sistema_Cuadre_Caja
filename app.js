// SISTEMA OPTIMIZADO - CUADRE DE CAJA PRO
let currentUser = null;
let currentTab = 'movimientos';
let movimientos = [];
let charts = {};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => document.getElementById('loadingScreen').style.display = 'none', 2000);
    auth.onAuthStateChanged(user => user ? (currentUser = user, initApp()) : showLogin());
    setupAuthListeners();
});

// AUTH
function setupAuthListeners() {
    document.getElementById('loginBtn').addEventListener('click', login);
    document.getElementById('registerBtn').addEventListener('click', register);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('loginPassword').addEventListener('keypress', e => e.key === 'Enter' && login());
}

async function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) return showAuthError('Completa todos los campos');
    try {
        await auth.signInWithEmailAndPassword(email, password);
        hideAuthError();
    } catch (error) {
        showAuthError(getAuthErrorMessage(error.code));
    }
}

async function register() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) return showAuthError('Completa todos los campos');
    if (password.length < 6) return showAuthError('Mínimo 6 caracteres');
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await initDefaultCategories(userCredential.user.uid);
        hideAuthError();
        showToast('Cuenta creada', 'success');
    } catch (error) {
        showAuthError(getAuthErrorMessage(error.code));
    }
}

async function logout() {
    if (await showConfirm('¿Cerrar sesión?', '¿Salir del sistema?')) {
        await auth.signOut();
        location.reload();
    }
}

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
}

function showAuthError(msg) {
    const err = document.getElementById('authError');
    err.textContent = msg;
    err.style.display = 'block';
}

function hideAuthError() {
    document.getElementById('authError').style.display = 'none';
}

function getAuthErrorMessage(code) {
    const msgs = {
        'auth/email-already-in-use': 'Correo ya registrado',
        'auth/invalid-email': 'Correo inválido',
        'auth/user-not-found': 'Usuario no encontrado',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/weak-password': 'Contraseña débil'
    };
    return msgs[code] || 'Error de autenticación';
}

// INIT APP
async function initApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'grid';
    
    document.getElementById('userName').textContent = currentUser.email.split('@')[0];
    updateCurrentDate();
    setupEventListeners();
    
    await loadCategorias();
    await cargarFondoInteligente();
    await loadMovimientos();
    
    switchTab('movimientos');
}

function updateCurrentDate() {
    const today = new Date();
    document.getElementById('currentDate').textContent = today.toLocaleDateString('es-ES', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    const todayStr = today.toISOString().split('T')[0];
    document.getElementById('fechaDesde').value = todayStr;
    document.getElementById('fechaHasta').value = todayStr;
}

// FONDO INTELIGENTE
async function cargarFondoInteligente() {
    try {
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        const ayerStr = ayer.toISOString().split('T')[0];
        
        const cuadreAyer = await db.collection(COLLECTIONS.CUADRES).doc(`${currentUser.uid}_${ayerStr}`).get();
        
        if (cuadreAyer.exists && cuadreAyer.data().totalContado !== undefined) {
            const fondo = cuadreAyer.data().totalContado;
            document.getElementById('fondoInicial').value = fondo.toFixed(2);
            document.getElementById('fondoInicial').disabled = true;
            
            const today = new Date().toISOString().split('T')[0];
            await db.collection(COLLECTIONS.CUADRES).doc(`${currentUser.uid}_${today}`).set({
                fondoInicial: fondo,
                userId: currentUser.uid,
                fecha: today,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            showToast(`Fondo automático: $${fondo.toFixed(2)}`, 'info');
        } else {
            const today = new Date().toISOString().split('T')[0];
            const cuadreHoy = await db.collection(COLLECTIONS.CUADRES).doc(`${currentUser.uid}_${today}`).get();
            
            if (cuadreHoy.exists && cuadreHoy.data().fondoInicial) {
                document.getElementById('fondoInicial').value = cuadreHoy.data().fondoInicial;
            }
            document.getElementById('fondoInicial').disabled = false;
        }
    } catch (error) {
        console.error('Error fondo:', error);
        document.getElementById('fondoInicial').disabled = false;
    }
}

// EVENT LISTENERS
function setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => switchTab(item.dataset.tab));
    });
    
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('darkModeSwitch').addEventListener('change', toggleTheme);
    
    document.getElementById('movimientoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await guardarMovimiento();
    });
    
    document.getElementById('tipoMovimiento').addEventListener('change', updateCategoriasSelect);
    document.getElementById('guardarDatosBtn').addEventListener('click', guardarDatosCuadre);
    document.getElementById('cuadrarCajaBtn').addEventListener('click', cuadrarCaja);
    
    document.querySelectorAll('.denom-input').forEach(input => {
        input.addEventListener('input', calcularTotalContado);
    });
    
    document.getElementById('totalVentas').addEventListener('input', actualizarResumenCuadre);
    
    document.getElementById('generarReporteBtn').addEventListener('click', generarReporte);
    document.getElementById('searchMovimientos').addEventListener('input', filtrarMovimientos);
    
    document.getElementById('addCategoriaIngresoBtn').addEventListener('click', () => agregarCategoria('ingresos'));
    document.getElementById('addCategoriaGastoBtn').addEventListener('click', () => agregarCategoria('gastos'));
    document.getElementById('resetDataBtn').addEventListener('click', resetData);
    
    document.getElementById('cuadreOkBtn').addEventListener('click', () => {
        document.getElementById('cuadreModal').classList.remove('active');
    });
}

function switchTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
    
    if (tabName === 'cuadre') actualizarResumenCuadre();
    else if (tabName === 'graficos') renderCharts();
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    document.querySelector('#themeToggle i').className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    document.getElementById('darkModeSwitch').checked = isDark;
    if (currentTab === 'graficos') renderCharts();
}

// MOVIMIENTOS
async function guardarMovimiento() {
    const tipo = document.getElementById('tipoMovimiento').value;
    const monto = parseFloat(document.getElementById('monto').value);
    const categoria = document.getElementById('categoria').value;
    const descripcion = document.getElementById('descripcion').value.trim();
    const formaPago = document.getElementById('formaPago').value;
    
    if (!monto || monto <= 0) return showToast('Monto inválido', 'error');
    if (!categoria) return showToast('Selecciona categoría', 'error');
    
    try {
        await db.collection(COLLECTIONS.MOVIMIENTOS).add({
            tipo,
            monto,
            categoria,
            descripcion,
            formaPago,
            fecha: new Date().toISOString(),
            userId: currentUser.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        document.getElementById('movimientoForm').reset();
        const labels = { ingreso: 'Ingreso', gasto: 'Gasto', deposito: 'Depósito' };
        showToast(`${labels[tipo]} registrado`, 'success');
        
        await loadMovimientos();
        actualizarResumenCuadre();
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al guardar', 'error');
    }
}

async function loadMovimientos() {
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        const snapshot = await db.collection(COLLECTIONS.MOVIMIENTOS)
            .where('userId', '==', currentUser.uid)
            .get();
        
        movimientos = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(mov => new Date(mov.fecha).toISOString().split('T')[0] === todayStr)
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        
        renderMovimientos();
        actualizarResumenDia();
    } catch (error) {
        console.error('Error:', error);
    }
}

function renderMovimientos() {
    const tbody = document.getElementById('movimientosTableBody');
    
    if (movimientos.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No hay movimientos</td></tr>';
        return;
    }
    
    tbody.innerHTML = movimientos.map(mov => {
        const hora = new Date(mov.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const badges = {
            ingreso: 'badge-ingreso',
            gasto: 'badge-gasto',
            deposito: 'badge-deposito'
        };
        const labels = {
            ingreso: '💰 INGRESO',
            gasto: '💸 GASTO',
            deposito: '🏦 DEPÓSITO'
        };
        
        return `
            <tr>
                <td>${hora}</td>
                <td><span class="badge ${badges[mov.tipo]}">${labels[mov.tipo]}</span></td>
                <td>${mov.categoria}</td>
                <td>${mov.descripcion || '-'}</td>
                <td><strong>$${mov.monto.toFixed(2)}</strong></td>
                <td>
                    <button class="action-btn btn-delete" onclick="eliminarMovimiento('${mov.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function filtrarMovimientos() {
    const search = document.getElementById('searchMovimientos').value.toLowerCase();
    const filtrados = movimientos.filter(mov => 
        mov.categoria.toLowerCase().includes(search) ||
        (mov.descripcion && mov.descripcion.toLowerCase().includes(search))
    );
    
    const tbody = document.getElementById('movimientosTableBody');
    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Sin resultados</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtrados.map(mov => {
        const hora = new Date(mov.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const badges = { ingreso: 'badge-ingreso', gasto: 'badge-gasto', deposito: 'badge-deposito' };
        const labels = { ingreso: '💰 INGRESO', gasto: '💸 GASTO', deposito: '🏦 DEPÓSITO' };
        
        return `
            <tr>
                <td>${hora}</td>
                <td><span class="badge ${badges[mov.tipo]}">${labels[mov.tipo]}</span></td>
                <td>${mov.categoria}</td>
                <td>${mov.descripcion || '-'}</td>
                <td><strong>$${mov.monto.toFixed(2)}</strong></td>
                <td>
                    <button class="action-btn btn-delete" onclick="eliminarMovimiento('${mov.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function eliminarMovimiento(id) {
    if (await showConfirm('Eliminar', '¿Eliminar este movimiento?')) {
        try {
            await db.collection(COLLECTIONS.MOVIMIENTOS).doc(id).delete();
            showToast('Eliminado', 'success');
            await loadMovimientos();
            actualizarResumenCuadre();
        } catch (error) {
            console.error('Error:', error);
            showToast('Error al eliminar', 'error');
        }
    }
}

function actualizarResumenDia() {
    const ingresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0);
    const gastos = movimientos.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0);
    const depositos = movimientos.filter(m => m.tipo === 'deposito').reduce((sum, m) => sum + m.monto, 0);
    
    document.getElementById('totalIngresos').textContent = `$${ingresos.toFixed(2)}`;
    document.getElementById('totalGastos').textContent = `$${gastos.toFixed(2)}`;
    document.getElementById('totalDepositos').textContent = `$${depositos.toFixed(2)}`;
}

// CUADRE
async function guardarDatosCuadre() {
    const fondo = parseFloat(document.getElementById('fondoInicial').value) || 0;
    const ventas = parseFloat(document.getElementById('totalVentas').value) || 0;
    
    if (fondo < 0 || ventas < 0) return showToast('Valores inválidos', 'error');
    
    try {
        const today = new Date().toISOString().split('T')[0];
        await db.collection(COLLECTIONS.CUADRES).doc(`${currentUser.uid}_${today}`).set({
            fondoInicial: fondo,
            totalVentas: ventas,
            userId: currentUser.uid,
            fecha: today,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        showToast('Datos guardados', 'success');
        actualizarResumenCuadre();
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al guardar', 'error');
    }
}

function actualizarResumenCuadre() {
    const fondo = parseFloat(document.getElementById('fondoInicial').value) || 0;
    const ventas = parseFloat(document.getElementById('totalVentas').value) || 0;
    const ingresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0);
    const gastos = movimientos.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0);
    const depositos = movimientos.filter(m => m.tipo === 'deposito').reduce((sum, m) => sum + m.monto, 0);
    
    // LÓGICA: Fondo + Ventas + Ingresos - Gastos - Depósitos
    const saldoEsperado = fondo + ventas + ingresos - gastos - depositos;
    
    document.getElementById('resumenFondo').textContent = `$${fondo.toFixed(2)}`;
    document.getElementById('resumenVentas').textContent = `$${ventas.toFixed(2)}`;
    document.getElementById('resumenIngresos').textContent = `$${ingresos.toFixed(2)}`;
    document.getElementById('resumenGastos').textContent = `-$${gastos.toFixed(2)}`;
    document.getElementById('resumenDepositos').textContent = `-$${depositos.toFixed(2)}`;
    document.getElementById('saldoEsperado').textContent = `$${saldoEsperado.toFixed(2)}`;
    
    calcularTotalContado();
}

function calcularTotalContado() {
    let total = 0;
    document.querySelectorAll('.denominacion-item').forEach(item => {
        const valor = parseFloat(item.dataset.valor);
        const cantidad = parseInt(item.querySelector('.denom-input').value) || 0;
        const subtotal = valor * cantidad;
        item.querySelector('.denom-total').textContent = `$${subtotal.toFixed(2)}`;
        total += subtotal;
    });
    
    const saldoEsperado = parseFloat(document.getElementById('saldoEsperado').textContent.replace('$', '')) || 0;
    const diferencia = total - saldoEsperado;
    
    document.getElementById('totalContado').textContent = `$${total.toFixed(2)}`;
    document.getElementById('diferencia').textContent = `$${diferencia.toFixed(2)}`;
    
    const difElem = document.getElementById('diferencia');
    if (diferencia > 0) difElem.style.color = '#fbbf24';
    else if (diferencia < 0) difElem.style.color = '#ef4444';
    else difElem.style.color = '#10b981';
}

async function cuadrarCaja() {
    const totalContado = parseFloat(document.getElementById('totalContado').textContent.replace('$', '')) || 0;
    const saldoEsperado = parseFloat(document.getElementById('saldoEsperado').textContent.replace('$', '')) || 0;
    const diferencia = totalContado - saldoEsperado;
    
    const denominaciones = {};
    document.querySelectorAll('.denominacion-item').forEach(item => {
        denominaciones[item.dataset.valor] = parseInt(item.querySelector('.denom-input').value) || 0;
    });
    
    try {
        const today = new Date().toISOString().split('T')[0];
        await db.collection(COLLECTIONS.CUADRES).doc(`${currentUser.uid}_${today}`).set({
            totalContado,
            saldoEsperado,
            diferencia,
            denominaciones,
            fechaCuadre: new Date().toISOString(),
            userId: currentUser.uid,
            fecha: today
        }, { merge: true });
        
        mostrarResultadoCuadre(diferencia);
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al cuadrar', 'error');
    }
}

function mostrarResultadoCuadre(diferencia) {
    const resultado = document.getElementById('cuadreResultado');
    
    if (diferencia === 0) {
        resultado.innerHTML = `
            <div class="cuadre-perfecto">
                <i class="fas fa-check-circle"></i>
                <h2>¡CAJA CUADRADA PERFECTAMENTE!</h2>
                <p class="diferencia-monto">$0.00</p>
                <p>El conteo coincide exactamente con el saldo esperado</p>
            </div>
        `;
    } else if (diferencia > 0) {
        resultado.innerHTML = `
            <div class="cuadre-sobrante">
                <i class="fas fa-exclamation-triangle"></i>
                <h2>SOBRANTE EN CAJA</h2>
                <p class="diferencia-monto">+$${diferencia.toFixed(2)}</p>
                <p>Hay más dinero del esperado</p>
            </div>
        `;
    } else {
        resultado.innerHTML = `
            <div class="cuadre-faltante">
                <i class="fas fa-times-circle"></i>
                <h2>FALTANTE EN CAJA</h2>
                <p class="diferencia-monto">-$${Math.abs(diferencia).toFixed(2)}</p>
                <p>Falta dinero en caja</p>
            </div>
        `;
    }
    
    document.getElementById('cuadreModal').classList.add('active');
}

// Continúa en siguiente parte...

// CATEGORÍAS
async function loadCategorias() {
    try {
        const docRef = db.collection(COLLECTIONS.CATEGORIAS).doc(currentUser.uid);
        const doc = await docRef.get();
        
        if (doc.exists) {
            const data = doc.data();
            
            // Migrar estructura antigua a nueva
            if (data.egresos && !data.gastos) {
                await docRef.update({
                    gastos: data.egresos,
                    depositos: ['Depósito a Banco']
                });
                // Recargar después de migrar
                const newDoc = await docRef.get();
                const newData = newDoc.data();
                renderCategoriasListas(newData.ingresos, newData.gastos, newData.depositos);
            } else {
                renderCategoriasListas(
                    data.ingresos || [], 
                    data.gastos || data.egresos || [], 
                    data.depositos || []
                );
            }
            
            updateCategoriasSelect();
        } else {
            await initDefaultCategories(currentUser.uid);
            await loadCategorias();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function renderCategoriasListas(ingresos, gastos, depositos) {
    document.getElementById('categoriasIngresoList').innerHTML = ingresos.map(cat => `
        <div class="categoria-item">
            <span>${cat}</span>
            <button class="categoria-delete" onclick="eliminarCategoria('ingresos', '${cat}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
    
    document.getElementById('categoriasGastoList').innerHTML = gastos.map(cat => `
        <div class="categoria-item">
            <span>${cat}</span>
            <button class="categoria-delete" onclick="eliminarCategoria('gastos', '${cat}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

async function updateCategoriasSelect() {
    const tipo = document.getElementById('tipoMovimiento').value;
    const select = document.getElementById('categoria');
    
    try {
        const doc = await db.collection(COLLECTIONS.CATEGORIAS).doc(currentUser.uid).get();
        
        let categorias;
        
        if (doc.exists) {
            const data = doc.data();
            
            if (tipo === 'ingreso') {
                categorias = data.ingresos || [];
            } else if (tipo === 'gasto') {
                // Soportar estructura antigua (egresos) y nueva (gastos)
                categorias = data.gastos || data.egresos || [];
            } else if (tipo === 'deposito') {
                categorias = data.depositos || ['Depósito a Banco'];
            }
        }
        
        // Categorías por defecto si no hay en BD
        if (!categorias || categorias.length === 0) {
            if (tipo === 'ingreso') {
                categorias = ['Dinero Personal (Suelto)', 'Devoluciones', 'Otros Ingresos'];
            } else if (tipo === 'gasto') {
                categorias = [
                    'Compras de Mercadería',
                    'Servicios Básicos',
                    'Salarios',
                    'Alquiler',
                    'Mantenimiento',
                    'Transporte',
                    'Papelería',
                    'Otros Gastos'
                ];
            } else {
                categorias = ['Depósito a Banco'];
            }
        }
        
        select.innerHTML = '<option value="">Selecciona categoría</option>' +
            categorias.map(cat => `<option value="${cat}">${cat}</option>`).join('');
            
    } catch (error) {
        console.error('Error:', error);
    }
}

async function agregarCategoria(tipo) {
    const inputId = tipo === 'ingresos' ? 'nuevaCategoriaIngreso' : 'nuevaCategoriaGasto';
    const input = document.getElementById(inputId);
    const nombre = input.value.trim();
    
    if (!nombre) return showToast('Ingresa nombre', 'error');
    
    try {
        const docRef = db.collection(COLLECTIONS.CATEGORIAS).doc(currentUser.uid);
        const doc = await docRef.get();
        const data = doc.data();
        
        if (data[tipo].includes(nombre)) return showToast('Ya existe', 'warning');
        
        data[tipo].push(nombre);
        await docRef.update({ [tipo]: data[tipo] });
        
        input.value = '';
        showToast('Agregada', 'success');
        await loadCategorias();
    } catch (error) {
        console.error('Error:', error);
        showToast('Error', 'error');
    }
}

async function eliminarCategoria(tipo, nombre) {
    if (await showConfirm('Eliminar', `¿Eliminar "${nombre}"?`)) {
        try {
            const docRef = db.collection(COLLECTIONS.CATEGORIAS).doc(currentUser.uid);
            const doc = await docRef.get();
            const data = doc.data();
            
            data[tipo] = data[tipo].filter(cat => cat !== nombre);
            await docRef.update({ [tipo]: data[tipo] });
            
            showToast('Eliminada', 'success');
            await loadCategorias();
        } catch (error) {
            console.error('Error:', error);
            showToast('Error', 'error');
        }
    }
}

// REPORTES
async function generarReporte() {
    const desde = document.getElementById('fechaDesde').value;
    const hasta = document.getElementById('fechaHasta').value;
    const tipo = document.getElementById('filtroTipo').value;
    
    if (!desde || !hasta) return showToast('Selecciona fechas', 'error');
    
    try {
        const snapshot = await db.collection(COLLECTIONS.MOVIMIENTOS)
            .where('userId', '==', currentUser.uid)
            .get();
        
        let movs = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(mov => {
                const fecha = new Date(mov.fecha).toISOString().split('T')[0];
                return fecha >= desde && fecha <= hasta;
            });
        
        if (tipo) movs = movs.filter(m => m.tipo === tipo);
        
        movs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        
        renderReporteTabla(movs);
        showToast('Reporte generado', 'success');
    } catch (error) {
        console.error('Error:', error);
        showToast('Error', 'error');
    }
}

function renderReporteTabla(movs) {
    const tbody = document.getElementById('reporteTableBody');
    
    if (movs.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Sin movimientos</td></tr>';
        return;
    }
    
    tbody.innerHTML = movs.map(mov => {
        const badges = { ingreso: 'badge-ingreso', gasto: 'badge-gasto', deposito: 'badge-deposito' };
        const labels = { ingreso: 'INGRESO', gasto: 'GASTO', deposito: 'DEPÓSITO' };
        
        return `
            <tr>
                <td>${new Date(mov.fecha).toLocaleDateString('es-ES')}</td>
                <td><span class="badge ${badges[mov.tipo]}">${labels[mov.tipo]}</span></td>
                <td>${mov.categoria}</td>
                <td>${mov.descripcion || '-'}</td>
                <td><strong>$${mov.monto.toFixed(2)}</strong></td>
            </tr>
        `;
    }).join('');
}

// GRÁFICOS
async function renderCharts() {
    await renderChart7Dias();
    await renderChartTipos();
}

async function renderChart7Dias() {
    try {
        const dias = [];
        for (let i = 6; i >= 0; i--) {
            const fecha = new Date();
            fecha.setDate(fecha.getDate() - i);
            dias.push(fecha);
        }
        
        const ingresos = [], gastos = [], depositos = [];
        
        for (const dia of dias) {
            const diaStr = dia.toISOString().split('T')[0];
            const snapshot = await db.collection(COLLECTIONS.MOVIMIENTOS)
                .where('userId', '==', currentUser.uid)
                .get();
            
            const movs = snapshot.docs
                .map(doc => doc.data())
                .filter(mov => new Date(mov.fecha).toISOString().split('T')[0] === diaStr);
            
            ingresos.push(movs.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0));
            gastos.push(movs.filter(m => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0));
            depositos.push(movs.filter(m => m.tipo === 'deposito').reduce((s, m) => s + m.monto, 0));
        }
        
        const ctx = document.getElementById('chart7dias');
        if (charts.chart7dias) charts.chart7dias.destroy();
        
        charts.chart7dias = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dias.map(d => d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })),
                datasets: [
                    {
                        label: 'Ingresos',
                        data: ingresos,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Gastos',
                        data: gastos,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Depósitos',
                        data: depositos,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: v => `$${v}` }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function renderChartTipos() {
    try {
        const primerDia = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const snapshot = await db.collection(COLLECTIONS.MOVIMIENTOS)
            .where('userId', '==', currentUser.uid)
            .get();
        
        const movs = snapshot.docs
            .map(doc => doc.data())
            .filter(mov => new Date(mov.fecha) >= primerDia);
        
        const ingresos = movs.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
        const gastos = movs.filter(m => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0);
        const depositos = movs.filter(m => m.tipo === 'deposito').reduce((s, m) => s + m.monto, 0);
        
        const ctx = document.getElementById('chartTipos');
        if (charts.chartTipos) charts.chartTipos.destroy();
        
        charts.chartTipos = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Ingresos', 'Gastos', 'Depósitos'],
                datasets: [{
                    data: [ingresos, gastos, depositos],
                    backgroundColor: ['#10b981', '#ef4444', '#3b82f6'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } }
            }
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

// UTILIDADES
function showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span class="toast-message">${msg}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function showConfirm(title, msg) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = msg;
        
        modal.classList.add('active');
        
        const handleOk = () => {
            modal.classList.remove('active');
            cleanup();
            resolve(true);
        };
        
        const handleCancel = () => {
            modal.classList.remove('active');
            cleanup();
            resolve(false);
        };
        
        const cleanup = () => {
            document.getElementById('confirmOkBtn').removeEventListener('click', handleOk);
            document.getElementById('confirmCancelBtn').removeEventListener('click', handleCancel);
        };
        
        document.getElementById('confirmOkBtn').addEventListener('click', handleOk);
        document.getElementById('confirmCancelBtn').addEventListener('click', handleCancel);
    });
}

async function resetData() {
    if (await showConfirm('⚠️ Limpiar', '¿Eliminar TODO?')) {
        try {
            const movSnap = await db.collection(COLLECTIONS.MOVIMIENTOS).where('userId', '==', currentUser.uid).get();
            const cuadreSnap = await db.collection(COLLECTIONS.CUADRES).where('userId', '==', currentUser.uid).get();
            
            const batch = db.batch();
            movSnap.docs.forEach(doc => batch.delete(doc.ref));
            cuadreSnap.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            
            showToast('Datos eliminados', 'success');
            location.reload();
        } catch (error) {
            console.error('Error:', error);
            showToast('Error', 'error');
        }
    }
}
