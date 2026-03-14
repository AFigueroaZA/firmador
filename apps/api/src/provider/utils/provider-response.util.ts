import type { ChallengeQuestion } from '@firmador/shared';
import type { ExternalProfile } from '../types';

export const toArray = <T>(value: T | T[] | undefined | null): T[] => {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
};

export const deepFindValue = (
  value: unknown,
  candidateKeys: string[],
): unknown => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  for (const [key, child] of Object.entries(record)) {
    if (candidateKeys.includes(key)) {
      return child;
    }
  }

  for (const child of Object.values(record)) {
    if (typeof child === 'object' && child !== null) {
      const result = deepFindValue(child, candidateKeys);
      if (result !== undefined) {
        return result;
      }
    }
  }

  return undefined;
};

export const coerceString = (value: unknown) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return undefined;
};

export const xmlEscape = (value: string | number | boolean | undefined) => {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
};

export const normalizeExternalProfile = (source: unknown): ExternalProfile => {
  const nombres =
    coerceString(deepFindValue(source, ['nombres', 'nombre', 'names'])) ?? '';
  const apellidoPaterno =
    coerceString(
      deepFindValue(source, ['apellidoPaterno', 'apellido', 'lastName']),
    ) ?? '';
  const apellidoMaterno =
    coerceString(
      deepFindValue(source, ['apellidoMaterno', 'secondLastName']),
    ) ?? '';
  const rut =
    coerceString(deepFindValue(source, ['rut', 'run', 'documentNumber'])) ?? '';
  const numeroDocumento =
    coerceString(
      deepFindValue(source, [
        'numeroDocumento',
        'nroSerieCedula',
        'serialNumber',
        'documentSerial',
      ]),
    ) ?? '';
  const email =
    coerceString(deepFindValue(source, ['email', 'correo', 'mail'])) ?? '';

  return {
    rut,
    numeroDocumento,
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    email,
    fechaNacimiento: coerceString(
      deepFindValue(source, ['fechaNacimiento', 'birthDate']),
    ),
    estadoCivil: coerceString(
      deepFindValue(source, ['estadoCivil', 'maritalStatus']),
    ),
    telefono: coerceString(
      deepFindValue(source, ['telefono', 'telefonoMovil', 'phone']),
    ),
  };
};

export const normalizeChallengeQuestions = (
  source: unknown,
): ChallengeQuestion[] => {
  const rawQuestions = toArray(
    deepFindValue(source, ['preguntas', 'questions', 'questionList']),
  );

  if (rawQuestions.length === 0) {
    return [1, 2, 3, 4].map((id) => ({
      id,
      prompt: `Selecciona la alternativa correcta para la pregunta ${id}.`,
      options: [1, 2, 3, 4, 5],
    }));
  }

  return rawQuestions.map((question, index) => {
    const prompt =
      coerceString(
        deepFindValue(question, ['texto', 'pregunta', 'label', 'prompt']),
      ) ?? `Pregunta ${index + 1}`;
    const id =
      Number.parseInt(
        coerceString(deepFindValue(question, ['id', 'pregunta', 'numero'])) ??
          String(index + 1),
        10,
      ) || index + 1;
    return {
      id,
      prompt,
      options: [1, 2, 3, 4, 5],
    };
  });
};
