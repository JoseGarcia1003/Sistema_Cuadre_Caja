// Firebase Configuration
// IMPORTANTE: Reemplaza estos valores con tu configuración de Firebase

const firebaseConfig = {
    apiKey: "AIzaSyBrfkWrKlsDVlYppt1ObZNUWu2tCtBkjM4",
    authDomain: "cuadre-caja-cee4f.firebaseapp.com",
    projectId: "cuadre-caja-cee4f",
    storageBucket: "cuadre-caja-cee4f.firebasestorage.app",
    messagingSenderId: "674087467274",
    appId: "1:674087467274:web:2e882e0b6a11d92bc7a2f3"
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
        'Dinero Personal (Suelto)',
        'Otros Ingresos'
    ],
    gastos: [
        'Compras',
        'Servicios',
        'Salarios',
        'Alquiler',
        'Servicios Básicos',
        'Otros Gastos'
    ],
    depositos: [
        'Depósito a Banco'
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
