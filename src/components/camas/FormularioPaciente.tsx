import { ChangeEvent, FormEvent, useState } from 'react';

export interface DatosPaciente {
  apellidoNombre: string;
  diagnostico: string;
  dni: string;
  domicilio: string;
  telefono: string;
}

const VACIO: DatosPaciente = {
  apellidoNombre: '',
  diagnostico: '',
  dni: '',
  domicilio: '',
  telefono: '',
};

interface Props {
  valoresIniciales?: DatosPaciente;
  enviando: boolean;
  textoBoton: string;
  onEnviar: (datos: DatosPaciente) => void;
  onCancelar: () => void;
}

export function FormularioPaciente({
  valoresIniciales,
  enviando,
  textoBoton,
  onEnviar,
  onCancelar,
}: Props) {
  const [datos, setDatos] = useState<DatosPaciente>(valoresIniciales ?? VACIO);

  function campo(clave: keyof DatosPaciente) {
    return {
      value: datos[clave],
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        setDatos((prev) => ({ ...prev, [clave]: e.target.value })),
    };
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onEnviar(datos);
  }

  const completo = datos.apellidoNombre.trim().length > 0 && datos.diagnostico.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <label className="text-sm text-superficie-600">Apellido y nombre *</label>
        <input
          {...campo('apellidoNombre')}
          required
          className="min-h-touch w-full rounded-md border border-superficie-200 px-3 text-sm outline-none focus:ring-2 focus:ring-institucional-600"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-superficie-600">Diagnóstico *</label>
        <input
          {...campo('diagnostico')}
          required
          className="min-h-touch w-full rounded-md border border-superficie-200 px-3 text-sm outline-none focus:ring-2 focus:ring-institucional-600"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-superficie-600">DNI</label>
        <input
          {...campo('dni')}
          inputMode="numeric"
          className="min-h-touch w-full rounded-md border border-superficie-200 px-3 text-sm outline-none focus:ring-2 focus:ring-institucional-600"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-superficie-600">Domicilio</label>
        <input
          {...campo('domicilio')}
          className="min-h-touch w-full rounded-md border border-superficie-200 px-3 text-sm outline-none focus:ring-2 focus:ring-institucional-600"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-superficie-600">Teléfono</label>
        <input
          {...campo('telefono')}
          className="min-h-touch w-full rounded-md border border-superficie-200 px-3 text-sm outline-none focus:ring-2 focus:ring-institucional-600"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!completo || enviando}
          className="min-h-touch flex-1 rounded-md bg-institucional-600 text-sm font-semibold text-white disabled:opacity-60"
        >
          {enviando ? 'Guardando…' : textoBoton}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="min-h-touch rounded-md border border-superficie-200 px-4 text-sm text-superficie-600"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
