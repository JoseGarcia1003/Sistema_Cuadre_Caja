const firebaseConfig = {
    apiKey: "TU_API_KEY_REAL_AQUI",
    authDomain: "cuadre-caja-cee4f.firebaseapp.com",
    projectId: "cuadre-caja-cee4f",
    storageBucket: "cuadre-caja-cee4f.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

const COLLECTIONS = {
    MOVIMIENTOS: 'movimientos',
    CUADRES: 'cuadres',
    CATEGORIAS: 'categorias',
    USUARIOS: 'usuarios',
    CONFIGURACION: 'configuracion'
};

const DEFAULT_CATEGORIAS = {
    ingresos: ['Ventas', 'Servicios', 'Cobros', 'Otros Ingresos'],
    egresos: ['Compras', 'Servicios', 'Salarios', 'Alquiler', 'Servicios Básicos', 'Otros Gastos']
};

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

window.firebaseConfig = firebaseConfig;
window.auth = auth;
window.db = db;
window.COLLECTIONS = COLLECTIONS;
window.initDefaultCategories = initDefaultCategories;
