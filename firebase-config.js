// Firebase v8 Compat - No uses import
const firebaseConfig = {
    apiKey: "AIzaSyBrfkWrKlsDVlYppt1ObZNUWu2tCtBkjM4",
    authDomain: "cuadre-caja-cee4f.firebaseapp.com",
    projectId: "cuadre-caja-cee4f",
    storageBucket: "cuadre-caja-cee4f.firebasestorage.app",
    messagingSenderId: "674087467274",
    appId: "1:674087467274:web:2e882e0b6a11d92bc7a2f3",
    measurementId: "G-PXKYJJ9M9R"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Colecciones
const COLLECTIONS = {
    MOVIMIENTOS: 'movimientos',
    CUADRES: 'cuadres',
    CATEGORIAS: 'categorias'
};

// Categorías predeterminadas
async function initDefaultCategories(userId) {
    await db.collection(COLLECTIONS.CATEGORIAS).doc(userId).set({
        ingresos: [
            'Dinero Personal (Suelto)',
            'Devoluciones',
            'Ajustes',
            'Otros Ingresos'
        ],
        gastos: [
            'Compras de Mercadería',
            'Servicios Básicos',
            'Salarios',
            'Alquiler',
            'Mantenimiento',
            'Transporte',
            'Publicidad',
            'Papelería',
            'Otros Gastos'
        ],
        depositos: [
            'Depósito a Banco'
        ]
    });
}
