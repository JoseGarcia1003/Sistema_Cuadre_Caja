// ========================================
// SISTEMA DE CUADRE DE CAJA PRO - OPTIMIZADO
// ========================================

let currentUser = null;
let currentTab = 'movimientos';
let movimientos = [];
let charts = {};

// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        document.getElementById('loadingScreen').style.display = 'none';
    }, 2000);
    
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            initApp();
        } else {
            showLogin();
        }
    });
    
    setupAuthListeners();
});

// ========================================
// AUTENTICACIÓN
// ========================================

function setupAuthListeners() {
    document.getElementById('loginBtn').addEventListener('click', login);
    document.getElementById('registerBtn').addEventListener('click', register);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    document.getElementById('loginPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') login();
    });
}

async function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showAuthError('Por favor completa todos los campos');
        return;
    }
    
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
    
    if (!email || !password) {
        showAuthError('Por favor completa todos los campos');
        return;
    }
    
    if (password.length < 6) {
        showAuthError('La contraseña debe tener al menos 6 caracteres');
        return;
    }
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await initDefaultCategories(userCredential.user.uid);
        hideAuthError();
        showToast('Cuenta creada exitosamente', 'success');
    } catch (error) {
        showAuthError(getAuthErrorMessage(error.code));
    }
}

async function logout() {
    if (await showConfirm('¿Cerrar sesión?', '¿Estás seguro de que deseas salir?')) {
        await auth.signOut();
        location.reload();
    }
}

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
}

function showAuthError(message) {
    const errorDiv = document.getElementById('authError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function hideAuthError() {
    document.getElementById('authError').style.display = 'none';
}

function getAuthErrorMessage(code) {
    const messages = {
        'auth/email-already-in-use': 'Este correo ya está registrado',
        'auth/invalid-email': 'Correo electrónico inválido',
        'auth/user-not-found': 'Usuario no encontrado',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/weak-password': 'La contraseña es muy débil',
        'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde'
    };
    return messages[code] || 'Error de autenticación';
}

// ========================================
// INICIALIZACIÓN DE LA APP
// ========================================

async function initApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'grid';
    
    document.getElementById('userName').textContent = currentUser.email.split('@')[0];
    document.getElementById('userRole').textContent = 'Usuario';
    
    updateCurrentDate();
    setupEventListeners();
    
    await loadCategorias();
    await cargarFondoInteligente();
    await loadMovimientos();
    
    switchTab('movimientos');
}

function updateCurrentDate() {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = today.toLocaleDateString('es-ES', options);
    document.getElementById('currentDate').textContent = dateStr;
    
    const todayStr = today.toISOString().split('T')[0];
    document.getElementById('fechaDesde').value = todayStr;
    document.getElementById('fechaHasta').value = todayStr;
}

// ========================================
// FONDO INTELIGENTE
// ========================================

async function cargarFondoInteligente() {
    try {
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        const ayerStr = ayer.toISOString().split('T')[0];
        
        const cuadreAyer = await db.collection(COLLECTIONS.CUADRES)
            .doc(`${currentUser.uid}_${ayerStr}`)
            .get();
        
        if (cuadreAyer.exists && cuadreAyer.data().totalContado !== undefined) {
            const fondoAutomatico = cuadreAyer.data().totalContado;
            document.getElementById('fondoInicial').value = fondoAutomatico.toFixed(2);
            document.getElementById('fondoInicial').disabled = true;
            
            const today = new Date().toISOString().split('T')[0];
            await db.collection(COLLECTIONS.CUADRES).doc(`${currentUser.uid}_${today}`).set({
                fondoInicial: fondoAutomatico,
                userId: currentUser.uid,
                fecha: today,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            showToast(`Fondo automático: $${fondoAutomatico.toFixed(2)}`, 'info');
        } else {
            const today = new Date().toISOString().split('T')[0];
            const cuadreHoy = await db.collection(COLLECTIONS.CUADRES)
                .doc(`${currentUser.uid}_${today}`)
                .get();
            
            if (cuadreHoy.exists && cuadreHoy.data().fondoInicial) {
                document.getElementById('fondoInicial').value = cuadreHoy.data().fondoInicial;
            }
            document.getElementById('fondoInicial').disabled = false;
        }
    } catch (error) {
        console.error('Error al cargar fondo:', error);
        document.getElementById('fondoInicial').disabled = false;
    }
}

// ========================================
// EVENT LISTENERS
// ========================================

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
    document.getElementById('guardarFondoBtn').addEventListener('click', guardarFondoInicial);
    document.getElementById('guardarCuadreBtn').addEventListener('click', guardarCuadre);
    
    document.querySelectorAll('.denom-input').forEach(input => {
        input.addEventListener('input', calcularTotalContado);
    });
    
    document.getElementById('generarReporteBtn').addEventListener('click', generarReporte);
    document.getElementById('exportarExcelBtn').addEventListener('click', exportarExcel);
    document.getElementById('searchMovimientos').addEventListener('input', filtrarMovimientos);
    
    document.getElementById('addCategoriaIngresoBtn').addEventListener('click', () => agregarCategoria('ingresos'));
    document.getElementById('addCategoriaEgresoBtn').addEventListener('click', () => agregarCategoria('egresos'));
    document.getElementById('resetDataBtn').addEventListener('click', resetData);
}

function switchTab(tabName) {
    currentTab = tabName;
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabName);
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
    
    if (tabName === 'cuadre') {
        actualizarResumenCuadre();
    } else if (tabName === 'graficos') {
        renderCharts();
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    
    const icon = document.querySelector('#themeToggle i');
    icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    
    document.getElementById('darkModeSwitch').checked = isDark;
    
    if (currentTab === 'graficos') {
        renderCharts();
    }
}

// ========================================
// MOVIMIENTOS
// ========================================

async function guardarMovimiento() {
    const tipo = document.getElementById('tipoMovimiento').value;
    const monto = parseFloat(document.getElementById('monto').value);
    const categoria = document.getElementById('categoria').value;
    const descripcion = document.getElementById('descripcion').value.trim();
    const formaPago = document.getElementById('formaPago').value;
    
    if (!monto || monto <= 0) {
        showToast('Ingresa un monto válido', 'error');
        return;
    }
    
    if (!categoria) {
        showToast('Selecciona una categoría', 'error');
        return;
    }
    
    try {
        const movimiento = {
            tipo,
            monto,
            categoria,
            descripcion,
            formaPago,
            fecha: new Date().toISOString(),
            userId: currentUser.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection(COLLECTIONS.MOVIMIENTOS).add(movimiento);
        
        document.getElementById('movimientoForm').reset();
        showToast(`${tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} registrado`, 'success');
        
        await loadMovimientos();
        actualizarResumenCuadre();
        
    } catch (error) {
        console.error('Error al guardar:', error);
        showToast('Error al guardar el movimiento', 'error');
    }
}

async function loadMovimientos() {
    try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        const snapshot = await db.collection(COLLECTIONS.MOVIMIENTOS)
            .where('userId', '==', currentUser.uid)
            .get();
        
        movimientos = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(mov => {
                const movFecha = new Date(mov.fecha).toISOString().split('T')[0];
                return movFecha === todayStr;
            })
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        
        renderMovimientos();
        actualizarResumenDia();
        
    } catch (error) {
        console.error('Error al cargar movimientos:', error);
    }
}

function renderMovimientos() {
    const tbody = document.getElementById('movimientosTableBody');
    
    if (movimientos.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No hay movimientos registrados hoy</td></tr>';
        return;
    }
    
    tbody.innerHTML = movimientos.map(mov => {
        const fecha = new Date(mov.fecha);
        const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const badgeClass = mov.tipo === 'ingreso' ? 'badge-ingreso' : 'badge-egreso';
        
        return `
            <tr>
                <td>${hora}</td>
                <td><span class="badge ${badgeClass}">${mov.tipo.toUpperCase()}</span></td>
                <td>${mov.categoria}</td>
                <td>${mov.descripcion || '-'}</td>
                <td>${getFormaPagoLabel(mov.formaPago)}</td>
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
    const searchTerm = document.getElementById('searchMovimientos').value.toLowerCase();
    const filtrados = movimientos.filter(mov => 
        mov.categoria.toLowerCase().includes(searchTerm) ||
        (mov.descripcion && mov.descripcion.toLowerCase().includes(searchTerm)) ||
        mov.tipo.toLowerCase().includes(searchTerm)
    );
    
    const tbody = document.getElementById('movimientosTableBody');
    
    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No se encontraron resultados</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtrados.map(mov => {
        const fecha = new Date(mov.fecha);
        const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const badgeClass = mov.tipo === 'ingreso' ? 'badge-ingreso' : 'badge-egreso';
        
        return `
            <tr>
                <td>${hora}</td>
                <td><span class="badge ${badgeClass}">${mov.tipo.toUpperCase()}</span></td>
                <td>${mov.categoria}</td>
                <td>${mov.descripcion || '-'}</td>
                <td>${getFormaPagoLabel(mov.formaPago)}</td>
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
    if (await showConfirm('Eliminar Movimiento', '¿Estás seguro?')) {
        try {
            await db.collection(COLLECTIONS.MOVIMIENTOS).doc(id).delete();
            showToast('Movimiento eliminado', 'success');
            await loadMovimientos();
            actualizarResumenCuadre();
        } catch (error) {
            console.error('Error al eliminar:', error);
            showToast('Error al eliminar', 'error');
        }
    }
}

function actualizarResumenDia() {
    const ingresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0);
    const egresos = movimientos.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + m.monto, 0);
    const balance = ingresos - egresos;
    
    document.getElementById('totalIngresos').textContent = `$${ingresos.toFixed(2)}`;
    document.getElementById('totalEgresos').textContent = `$${egresos.toFixed(2)}`;
    document.getElementById('balance').textContent = `$${balance.toFixed(2)}`;
}

function getFormaPagoLabel(forma) {
    const labels = {
        'efectivo': '💵 Efectivo',
        'tarjeta': '💳 Tarjeta',
        'transferencia': '🏦 Transferencia',
        'cheque': '📝 Cheque'
    };
    return labels[forma] || forma;
}

// ========================================
// CUADRE DE CAJA
// ========================================

async function guardarFondoInicial() {
    const fondo = parseFloat(document.getElementById('fondoInicial').value);
    
    if (!fondo || fondo < 0) {
        showToast('Ingresa un fondo válido', 'error');
        return;
    }
    
    try {
        const today = new Date().toISOString().split('T')[0];
        await db.collection(COLLECTIONS.CUADRES).doc(`${currentUser.uid}_${today}`).set({
            fondoInicial: fondo,
            userId: currentUser.uid,
            fecha: today,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        showToast('Fondo guardado', 'success');
        actualizarResumenCuadre();
        
    } catch (error) {
        console.error('Error al guardar fondo:', error);
        showToast('Error al guardar fondo', 'error');
    }
}

function actualizarResumenCuadre() {
    const fondoInicial = parseFloat(document.getElementById('fondoInicial').value) || 0;
    const ingresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0);
    const egresos = movimientos.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + m.monto, 0);
    const saldoEsperado = fondoInicial + ingresos - egresos;
    
    document.getElementById('cuadreFondoInicial').textContent = `$${fondoInicial.toFixed(2)}`;
    document.getElementById('cuadreIngresos').textContent = `$${ingresos.toFixed(2)}`;
    document.getElementById('cuadreEgresos').textContent = `$${egresos.toFixed(2)}`;
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
    if (diferencia > 0) {
        difElem.style.color = '#10b981';
    } else if (diferencia < 0) {
        difElem.style.color = '#ef4444';
    } else {
        difElem.style.color = 'white';
    }
}

async function guardarCuadre() {
    const totalContado = parseFloat(document.getElementById('totalContado').textContent.replace('$', '')) || 0;
    const saldoEsperado = parseFloat(document.getElementById('saldoEsperado').textContent.replace('$', '')) || 0;
    const diferencia = totalContado - saldoEsperado;
    
    const denominaciones = {};
    document.querySelectorAll('.denominacion-item').forEach(item => {
        const valor = item.dataset.valor;
        const cantidad = parseInt(item.querySelector('.denom-input').value) || 0;
        denominaciones[valor] = cantidad;
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
        
        if (diferencia === 0) {
            showToast('Cuadre exacto ✓', 'success');
        } else if (diferencia > 0) {
            showToast(`Sobrante: $${diferencia.toFixed(2)}`, 'warning');
        } else {
            showToast(`Faltante: $${Math.abs(diferencia).toFixed(2)}`, 'error');
        }
        
    } catch (error) {
        console.error('Error al guardar cuadre:', error);
        showToast('Error al guardar cuadre', 'error');
    }
}

// ========================================
// CATEGORÍAS
// ========================================

async function loadCategorias() {
    try {
        const doc = await db.collection(COLLECTIONS.CATEGORIAS).doc(currentUser.uid).get();
        
        if (doc.exists) {
            const data = doc.data();
            renderCategoriasListas(data.ingresos, data.egresos);
            updateCategoriasSelect();
        } else {
            await initDefaultCategories(currentUser.uid);
            await loadCategorias();
        }
    } catch (error) {
        console.error('Error al cargar categorías:', error);
    }
}

function renderCategoriasListas(ingresos, egresos) {
    document.getElementById('categoriasIngresoList').innerHTML = ingresos.map(cat => `
        <div class="categoria-item">
            <span>${cat}</span>
            <button class="categoria-delete" onclick="eliminarCategoria('ingresos', '${cat}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
    
    document.getElementById('categoriasEgresoList').innerHTML = egresos.map(cat => `
        <div class="categoria-item">
            <span>${cat}</span>
            <button class="categoria-delete" onclick="eliminarCategoria('egresos', '${cat}')">
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
        
        if (doc.exists) {
            const categorias = tipo === 'ingreso' ? doc.data().ingresos : doc.data().egresos;
            select.innerHTML = '<option value="">Selecciona una categoría</option>' +
                categorias.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        }
    } catch (error) {
        console.error('Error al actualizar categorías:', error);
    }
}

async function agregarCategoria(tipo) {
    const inputId = tipo === 'ingresos' ? 'nuevaCategoriaIngreso' : 'nuevaCategoriaEgreso';
    const input = document.getElementById(inputId);
    const nombre = input.value.trim();
    
    if (!nombre) {
        showToast('Ingresa un nombre', 'error');
        return;
    }
    
    try {
        const docRef = db.collection(COLLECTIONS.CATEGORIAS).doc(currentUser.uid);
        const doc = await docRef.get();
        const data = doc.data();
        
        if (data[tipo].includes(nombre)) {
            showToast('Categoría ya existe', 'warning');
            return;
        }
        
        data[tipo].push(nombre);
        await docRef.update({ [tipo]: data[tipo] });
        
        input.value = '';
        showToast('Categoría agregada', 'success');
        await loadCategorias();
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al agregar categoría', 'error');
    }
}

async function eliminarCategoria(tipo, nombre) {
    if (await showConfirm('Eliminar Categoría', `¿Eliminar "${nombre}"?`)) {
        try {
            const docRef = db.collection(COLLECTIONS.CATEGORIAS).doc(currentUser.uid);
            const doc = await docRef.get();
            const data = doc.data();
            
            data[tipo] = data[tipo].filter(cat => cat !== nombre);
            await docRef.update({ [tipo]: data[tipo] });
            
            showToast('Categoría eliminada', 'success');
            await loadCategorias();
            
        } catch (error) {
            console.error('Error:', error);
            showToast('Error al eliminar', 'error');
        }
    }
}

// Continúa en siguiente mensaje...
// ========================================
// REPORTES
// ========================================

async function generarReporte() {
    const fechaDesde = document.getElementById('fechaDesde').value;
    const fechaHasta = document.getElementById('fechaHasta').value;
    const tipo = document.getElementById('filtroTipo').value;
    
    if (!fechaDesde || !fechaHasta) {
        showToast('Selecciona un rango de fechas', 'error');
        return;
    }
    
    try {
        const snapshot = await db.collection(COLLECTIONS.MOVIMIENTOS)
            .where('userId', '==', currentUser.uid)
            .where('fecha', '>=', new Date(fechaDesde).toISOString())
            .where('fecha', '<=', new Date(fechaHasta + 'T23:59:59').toISOString())
            .orderBy('fecha', 'desc')
            .get();
        
        let reporteMovimientos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (tipo) reporteMovimientos = reporteMovimientos.filter(m => m.tipo === tipo);
        
        const ingresos = reporteMovimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0);
        const egresos = reporteMovimientos.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + m.monto, 0);
        
        document.getElementById('reporteIngresos').textContent = `$${ingresos.toFixed(2)}`;
        document.getElementById('reporteEgresos').textContent = `$${egresos.toFixed(2)}`;
        document.getElementById('reporteBalance').textContent = `$${(ingresos - egresos).toFixed(2)}`;
        
        renderReporteTabla(reporteMovimientos);
        renderReporteCategorias(reporteMovimientos);
        
        showToast('Reporte generado', 'success');
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al generar reporte', 'error');
    }
}

function renderReporteTabla(movimientos) {
    const tbody = document.getElementById('reporteTableBody');
    
    if (movimientos.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No hay movimientos</td></tr>';
        return;
    }
    
    tbody.innerHTML = movimientos.map(mov => `
        <tr>
            <td>${new Date(mov.fecha).toLocaleDateString('es-ES')}</td>
            <td><span class="badge badge-${mov.tipo}">${mov.tipo.toUpperCase()}</span></td>
            <td>${mov.categoria}</td>
            <td>${mov.descripcion || '-'}</td>
            <td><strong>$${mov.monto.toFixed(2)}</strong></td>
        </tr>
    `).join('');
}

function renderReporteCategorias(movimientos) {
    const categorias = {};
    movimientos.forEach(mov => {
        categorias[mov.categoria] = (categorias[mov.categoria] || 0) + mov.monto;
    });
    
    const ctx = document.getElementById('reporteCategoriaChart');
    
    if (charts.reporteCategoria) charts.reporteCategoria.destroy();
    
    charts.reporteCategoria = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(categorias),
            datasets: [{
                label: 'Monto',
                data: Object.values(categorias),
                backgroundColor: '#10b981',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: v => `$${v}` }
                }
            }
        }
    });
}

function exportarExcel() {
    showToast('Función próximamente', 'info');
}

// ========================================
// GRÁFICOS
// ========================================

async function renderCharts() {
    await renderIngresosEgresosChart();
    await renderCategoriasPieChart();
    await renderFormasPagoChart();
    await renderTendenciaMensualChart();
}

async function renderIngresosEgresosChart() {
    try {
        const ultimos7Dias = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const fecha = new Date(today);
            fecha.setDate(fecha.getDate() - i);
            ultimos7Dias.push(fecha);
        }
        
        const ingresosPorDia = [];
        const egresosPorDia = [];
        
        for (const fecha of ultimos7Dias) {
            const fechaInicio = new Date(fecha.setHours(0, 0, 0, 0));
            const fechaFin = new Date(fecha.setHours(23, 59, 59, 999));
            
            const snapshot = await db.collection(COLLECTIONS.MOVIMIENTOS)
                .where('userId', '==', currentUser.uid)
                .where('fecha', '>=', fechaInicio.toISOString())
                .where('fecha', '<=', fechaFin.toISOString())
                .get();
            
            const movs = snapshot.docs.map(doc => doc.data());
            ingresosPorDia.push(movs.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0));
            egresosPorDia.push(movs.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + m.monto, 0));
        }
        
        const ctx = document.getElementById('ingresosEgresosChart');
        
        if (charts.ingresosEgresos) charts.ingresosEgresos.destroy();
        
        charts.ingresosEgresos = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ultimos7Dias.map(f => f.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })),
                datasets: [
                    {
                        label: 'Ingresos',
                        data: ingresosPorDia,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Egresos',
                        data: egresosPorDia,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
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

async function renderCategoriasPieChart() {
    try {
        const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        
        const snapshot = await db.collection(COLLECTIONS.MOVIMIENTOS)
            .where('userId', '==', currentUser.uid)
            .where('fecha', '>=', primerDiaMes.toISOString())
            .get();
        
        const categorias = {};
        snapshot.docs.forEach(doc => {
            const mov = doc.data();
            categorias[mov.categoria] = (categorias[mov.categoria] || 0) + mov.monto;
        });
        
        const ctx = document.getElementById('categoriasPieChart');
        
        if (charts.categoriasPie) charts.categoriasPie.destroy();
        
        charts.categoriasPie = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categorias),
                datasets: [{
                    data: Object.values(categorias),
                    backgroundColor: ['#10b981', '#34d399', '#059669', '#fbbf24', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#f97316', '#14b8a6'],
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

async function renderFormasPagoChart() {
    const formasPago = {};
    movimientos.forEach(mov => {
        formasPago[mov.formaPago] = (formasPago[mov.formaPago] || 0) + mov.monto;
    });
    
    const ctx = document.getElementById('formasPagoChart');
    
    if (charts.formasPago) charts.formasPago.destroy();
    
    charts.formasPago = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(formasPago).map(getFormaPagoLabel),
            datasets: [{
                data: Object.values(formasPago),
                backgroundColor: ['#10b981', '#34d399', '#fbbf24', '#f59e0b'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

async function renderTendenciaMensualChart() {
    try {
        const meses = [];
        const today = new Date();
        
        for (let i = 5; i >= 0; i--) {
            meses.push(new Date(today.getFullYear(), today.getMonth() - i, 1));
        }
        
        const ingresosPorMes = [];
        const egresosPorMes = [];
        
        for (const mes of meses) {
            const primerDia = new Date(mes.getFullYear(), mes.getMonth(), 1);
            const ultimoDia = new Date(mes.getFullYear(), mes.getMonth() + 1, 0, 23, 59, 59);
            
            const snapshot = await db.collection(COLLECTIONS.MOVIMIENTOS)
                .where('userId', '==', currentUser.uid)
                .where('fecha', '>=', primerDia.toISOString())
                .where('fecha', '<=', ultimoDia.toISOString())
                .get();
            
            const movs = snapshot.docs.map(doc => doc.data());
            ingresosPorMes.push(movs.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0));
            egresosPorMes.push(movs.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + m.monto, 0));
        }
        
        const ctx = document.getElementById('tendenciaMensualChart');
        
        if (charts.tendenciaMensual) charts.tendenciaMensual.destroy();
        
        charts.tendenciaMensual = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: meses.map(m => m.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })),
                datasets: [
                    {
                        label: 'Ingresos',
                        data: ingresosPorMes,
                        backgroundColor: '#10b981',
                        borderRadius: 8
                    },
                    {
                        label: 'Egresos',
                        data: egresosPorMes,
                        backgroundColor: '#ef4444',
                        borderRadius: 8
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

// ========================================
// UTILIDADES
// ========================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function showConfirm(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        
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
    if (await showConfirm('⚠️ Limpiar Datos', '¿Eliminar TODO? No se puede deshacer.')) {
        try {
            const movSnapshot = await db.collection(COLLECTIONS.MOVIMIENTOS)
                .where('userId', '==', currentUser.uid)
                .get();
            
            const batch = db.batch();
            movSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            
            const cuadreSnapshot = await db.collection(COLLECTIONS.CUADRES)
                .where('userId', '==', currentUser.uid)
                .get();
            
            cuadreSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            
            showToast('Datos eliminados', 'success');
            location.reload();
        } catch (error) {
            console.error('Error:', error);
            showToast('Error al limpiar datos', 'error');
        }
    }
}
