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

/**
 * Coerces values that may come as arrays of words (ClaveUnica returns
 * `name.nombres` and `name.apellidos` as string arrays).
 */
const coerceNameValue = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => coerceString(item)?.trim())
      .filter((item): item is string => Boolean(item));
    return parts.length > 0 ? parts.join(' ') : undefined;
  }
  return coerceString(value);
};

export const normalizeExternalProfile = (source: unknown): ExternalProfile => {
  const nombres =
    coerceNameValue(
      deepFindValue(source, ['nombres', 'nombre', 'names', 'givenName']),
    ) ?? '';

  let apellidoPaterno =
    coerceString(
      deepFindValue(source, ['apellidoPaterno', 'apellido', 'lastName']),
    ) ?? '';
  let apellidoMaterno =
    coerceString(
      deepFindValue(source, ['apellidoMaterno', 'secondLastName']),
    ) ?? '';
  if (!apellidoPaterno) {
    // ClaveUnica: name.apellidos is an array (or space-separated string).
    const rawApellidos = deepFindValue(source, ['apellidos', 'surnames']);
    const apellidos = (
      Array.isArray(rawApellidos)
        ? rawApellidos.map((item) => coerceString(item) ?? '')
        : (coerceString(rawApellidos) ?? '').split(/\s+/)
    )
      .map((item) => item.trim())
      .filter(Boolean);
    apellidoPaterno = apellidos[0] ?? '';
    apellidoMaterno = apellidoMaterno || apellidos.slice(1).join(' ') || '';
  }

  let rut =
    coerceString(deepFindValue(source, ['rut', 'run', 'documentNumber'])) ?? '';
  if (!rut) {
    // ClaveUnica: RolUnico = { numero, DV, tipo }.
    const rolUnico = deepFindValue(source, [
      'RolUnico',
      'rolUnico',
      'rolunico',
    ]);
    if (rolUnico && typeof rolUnico === 'object') {
      const numero = coerceString(
        deepFindValue(rolUnico, ['numero', 'number', 'nro']),
      );
      const dv = coerceString(deepFindValue(rolUnico, ['DV', 'dv', 'Dv']));
      if (numero) {
        rut = dv ? `${numero}-${dv}` : numero;
      }
    }
  }
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

/** Looks up candidate keys one by one, in priority order. */
const pickValue = (source: unknown, keys: string[]): unknown => {
  for (const key of keys) {
    const value = deepFindValue(source, [key]);
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
};

const QUESTION_LIST_KEYS = [
  'preguntas',
  'listaPreguntas',
  'preguntasChallenge',
  'questions',
  'questionList',
];
const QUESTION_TEXT_KEYS = [
  'textoPregunta',
  'descripcionPregunta',
  'glosaPregunta',
  'texto',
  'descripcion',
  'glosa',
  'enunciado',
  'label',
  'prompt',
  'pregunta',
];
const QUESTION_ID_KEYS = [
  'numeroPregunta',
  'idPregunta',
  'codigoPregunta',
  'numero',
  'id',
  'pregunta',
];
const OPTION_LIST_KEYS = [
  'alternativas',
  'listaAlternativas',
  'opciones',
  'respuestas',
  'options',
  'answers',
];
const OPTION_VALUE_KEYS = [
  'numeroAlternativa',
  'idAlternativa',
  'codigoAlternativa',
  'alternativa',
  'respuesta',
  'numero',
  'codigo',
  'valor',
  'id',
];
const OPTION_TEXT_KEYS = [
  'descripcionAlternativa',
  'glosaAlternativa',
  'textoAlternativa',
  'descripcion',
  'glosa',
  'texto',
  'label',
  'nombre',
];

const defaultOptions = () =>
  [1, 2, 3, 4, 5].map((value) => ({ value, label: String(value) }));

const normalizeQuestionOptions = (question: unknown) => {
  const rawOptions = toArray(pickValue(question, OPTION_LIST_KEYS));
  if (rawOptions.length === 0) {
    return defaultOptions();
  }

  return rawOptions.map((option, index) => {
    if (typeof option === 'string' || typeof option === 'number') {
      return { value: index + 1, label: String(option) };
    }
    const value =
      Number.parseInt(
        coerceString(pickValue(option, OPTION_VALUE_KEYS)) ?? String(index + 1),
        10,
      ) || index + 1;
    const label =
      coerceString(pickValue(option, OPTION_TEXT_KEYS)) ?? String(value);
    return { value, label };
  });
};

/**
 * Extracts the real challenge questions from the provider response, or
 * returns null when the payload shape is not recognized.
 */
export const extractChallengeQuestions = (
  source: unknown,
): ChallengeQuestion[] | null => {
  const rawQuestions = toArray(pickValue(source, QUESTION_LIST_KEYS));
  if (rawQuestions.length === 0) {
    return null;
  }

  return rawQuestions.map((question, index) => {
    const promptCandidate = coerceString(
      pickValue(question, QUESTION_TEXT_KEYS),
    );
    // Ignore purely numeric values (they are ids, not the question text).
    const prompt =
      promptCandidate && !/^\d+$/.test(promptCandidate.trim())
        ? promptCandidate
        : `Pregunta ${index + 1}`;
    const id =
      Number.parseInt(
        coerceString(pickValue(question, QUESTION_ID_KEYS)) ??
          String(index + 1),
        10,
      ) || index + 1;
    return {
      id,
      prompt,
      options: normalizeQuestionOptions(question),
    };
  });
};

export const normalizeChallengeQuestions = (
  source: unknown,
): ChallengeQuestion[] => {
  return (
    extractChallengeQuestions(source) ??
    [1, 2, 3, 4].map((id) => ({
      id,
      prompt: `Selecciona la alternativa correcta para la pregunta ${id}.`,
      options: defaultOptions(),
    }))
  );
};
