// Firebase Configuration
// IMPORTANTE: Reemplaza estos valores con tu configuración de Firebase

const firebaseConfig = {
    apiKey: "TU_API_KEY_AQUI",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto-id",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referencias a servicios
const auth = firebase.auth();
const db = firebase.firestore();

// Configurar persistencia
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// Colecciones de Firestore
const COLLECTIONS = {
    MOVIMIENTOS: 'movimientos',
    CUADRES: 'cuadres',
    CATEGORIAS: 'categorias',
    USUARIOS: 'usuarios',
    CONFIGURACION: 'configuracion'
};

// Categorías predeterminadas
const DEFAULT_CATEGORIAS = {
    ingresos: [
        'Ventas',
        'Servicios',
        'Cobros',
        'Otros Ingresos'
    ],
    egresos: [
        'Compras',
        'Servicios',
        'Salarios',
        'Alquiler',
        'Servicios Básicos',
        'Otros Gastos'
    ]
};

// Inicializar categorías por defecto si no existen
async function initDefaultCategories(userId) {
    try {
        const categoriasRef = db.collection(COLLECTIONS.CATEGORIAS).doc(userId);
        const doc = await categoriasRef.get();
        
        if (!doc.exists) {
            await categoriasRef.set({
                ingresos: DEFAULT_CATEGORIAS.ingresos,
                egresos: DEFAULT_CATEGORIAS.egresos,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error al inicializar categorías:', error);
    }
}

// Exportar para uso global
window.firebaseConfig = firebaseConfig;
window.auth = auth;
window.db = db;
window.COLLECTIONS = COLLECTIONS;
window.initDefaultCategories = initDefaultCategories;
