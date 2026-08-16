import type { Config } from 'tailwindcss';

// ============================================================
// DESIGN TOKENS — Sistema de Gestión de Camas Hospitalarias
// ============================================================
// Filosofía: alto contraste, fondos claros, un solo color como
// portador de significado clínico (el color NUNCA es decorativo
// acá — si algo es rojo, es porque la cama está ocupada). El azul
// institucional queda reservado para estructura (nav, headers,
// acciones primarias), nunca para estado de camas, para que no
// compita visualmente con el semáforo clínico.
// ============================================================

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // --- Azul institucional (navy → royal blue) ---
        // Estructura: navbar, sidebar, headers de sector, botones primarios.
        institucional: {
          950: '#050B1A',
          900: '#0B1633',
          800: '#12224D',
          700: '#193076',
          600: '#1E4DB0', // royal blue — color de marca / acciones primarias
          500: '#3566D6',
          400: '#6D93E8',
          100: '#E4ECFB', // fondo tenue para chips/hover institucionales
        },

        // --- Superficie neutra: blancos y grises muy claros ---
        superficie: {
          0: '#FFFFFF',
          50: '#F7F9FC',
          100: '#EEF2F7',
          200: '#E1E7EF', // bordes
          300: '#CBD3DF',
          400: '#98A2B3', // texto secundario
          600: '#475467', // texto de soporte
          900: '#101828', // texto principal
        },

        // --- Estados clínicos de una cama ---
        // Cada estado: 100 (fondo tenue), 500 (color principal / ícono / borde
        // fuerte), 700 (texto sobre fondo tenue, cumple AA sobre el 100).
        disponible: {
          100: '#E0FBFF',
          500: '#06AED4', // cyan — "libre, lista para usar"
          700: '#0E7490',
        },
        ocupada: {
          100: '#FEECEB',
          500: '#F0453B', // rojo/coral — único uso: ocupada o alerta de mantenimiento
          700: '#B42318',
        },
        limpieza: {
          100: '#FEF6E7',
          500: '#F5A524', // ámbar — desinfección/limpieza en curso
          700: '#B54708',
        },
        // No especificado en el brief de paleta, pero necesario porque
        // el enum estado_cama incluye 'reservada'. Violeta: distinguible
        // a distancia de los otros tres, sin invadir el rojo de alerta.
        reservada: {
          100: '#F1EEFE',
          500: '#7C5CFC',
          700: '#5B3DD1',
        },
      },

      fontFamily: {
        // Display: identidad institucional en headers y navbar — trazo
        // técnico/geométrico, legible en mayúsculas a distancia (señalética).
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        // UI/cuerpo: la que realmente se lee en pantalla, optimizada para
        // tamaños chicos en celular.
        sans: ['Inter', 'system-ui', 'sans-serif'],
        // Datos: números de cama, DNI, horarios y timestamps de auditoría.
        // Tabular por diseño — evita que "8" y "3" se confundan de un vistazo.
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },

      borderRadius: {
        card: '0.875rem',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(16 24 40 / 0.06), 0 1px 3px 0 rgb(16 24 40 / 0.08)',
      },

      // Altura mínima táctil (44px iOS HIG / 48dp Material) para todos los
      // controles de cambio de estado.
      minHeight: {
        touch: '48px',
      },
    },
  },
  plugins: [],
} satisfies Config;
