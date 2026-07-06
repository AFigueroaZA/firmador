import {
  extractChallengeQuestions,
  normalizeExternalProfile,
} from './provider-response.util';

describe('normalizeExternalProfile', () => {
  it('parses the standard ClaveUnica userinfo payload', () => {
    const profile = normalizeExternalProfile({
      sub: 'abc123',
      RolUnico: { numero: 12345678, DV: '9', tipo: 'RUN' },
      name: {
        nombres: ['Juan', 'Andrés'],
        apellidos: ['Pérez', 'Soto'],
      },
      email: 'juan@correo.cl',
    });

    expect(profile.rut).toBe('12345678-9');
    expect(profile.nombres).toBe('Juan Andrés');
    expect(profile.apellidoPaterno).toBe('Pérez');
    expect(profile.apellidoMaterno).toBe('Soto');
    expect(profile.email).toBe('juan@correo.cl');
  });

  it('parses flat provider payloads', () => {
    const profile = normalizeExternalProfile({
      rut: '11111111-1',
      nombres: 'Nombre Andres',
      apellidoPaterno: 'Apellido',
      apellidoMaterno: 'Materno',
      email: 'test@email.com',
    });

    expect(profile.rut).toBe('11111111-1');
    expect(profile.nombres).toBe('Nombre Andres');
    expect(profile.apellidoPaterno).toBe('Apellido');
    expect(profile.apellidoMaterno).toBe('Materno');
  });

  it('splits space-separated apellidos when they come as a single string', () => {
    const profile = normalizeExternalProfile({
      RolUnico: { numero: 5555555, DV: 'K' },
      name: { nombres: 'María', apellidos: 'González Díaz' },
    });

    expect(profile.rut).toBe('5555555-K');
    expect(profile.nombres).toBe('María');
    expect(profile.apellidoPaterno).toBe('González');
    expect(profile.apellidoMaterno).toBe('Díaz');
  });

  it('parses wrapped payloads', () => {
    const profile = normalizeExternalProfile({
      data: {
        RolUnico: { numero: 22222222, DV: '2' },
        name: { nombres: ['Ana'], apellidos: ['Rojas', 'Vega'] },
      },
    });

    expect(profile.rut).toBe('22222222-2');
    expect(profile.nombres).toBe('Ana');
    expect(profile.apellidoPaterno).toBe('Rojas');
    expect(profile.apellidoMaterno).toBe('Vega');
  });
});

describe('extractChallengeQuestions', () => {
  it('parses questions with textual alternatives', () => {
    const questions = extractChallengeQuestions({
      idChallenge: '000000010000000001000000',
      preguntas: [
        {
          numeroPregunta: 1,
          textoPregunta: '¿Con cuál banco tiene un crédito?',
          alternativas: [
            { numeroAlternativa: 1, descripcionAlternativa: 'Banco Estado' },
            { numeroAlternativa: 2, descripcionAlternativa: 'Banco de Chile' },
            { numeroAlternativa: 3, descripcionAlternativa: 'Ninguno' },
          ],
        },
      ],
    });

    expect(questions).not.toBeNull();
    expect(questions![0].id).toBe(1);
    expect(questions![0].prompt).toBe('¿Con cuál banco tiene un crédito?');
    expect(questions![0].options).toEqual([
      { value: 1, label: 'Banco Estado' },
      { value: 2, label: 'Banco de Chile' },
      { value: 3, label: 'Ninguno' },
    ]);
  });

  it('parses questions using generic keys', () => {
    const questions = extractChallengeQuestions({
      questions: [
        {
          id: 2,
          texto: 'Pregunta real',
          opciones: [
            { id: 1, descripcion: 'Opción A' },
            { id: 2, descripcion: 'Opción B' },
          ],
        },
      ],
    });

    expect(questions![0]).toEqual({
      id: 2,
      prompt: 'Pregunta real',
      options: [
        { value: 1, label: 'Opción A' },
        { value: 2, label: 'Opción B' },
      ],
    });
  });

  it('parses plain string alternatives', () => {
    const questions = extractChallengeQuestions({
      preguntas: [
        {
          pregunta: '¿Comuna de residencia?',
          respuestas: ['Santiago', 'Punta Arenas'],
        },
      ],
    });

    expect(questions![0].prompt).toBe('¿Comuna de residencia?');
    expect(questions![0].options).toEqual([
      { value: 1, label: 'Santiago' },
      { value: 2, label: 'Punta Arenas' },
    ]);
  });

  it('returns null when no question list is present', () => {
    expect(extractChallengeQuestions({ idChallenge: 'x' })).toBeNull();
  });
});
