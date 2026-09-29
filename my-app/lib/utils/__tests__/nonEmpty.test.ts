import { nonEmpty, atLeastTwo } from '../nonEmpty';

describe('nonEmpty / atLeastTwo — tupla do contrato gerado provada em runtime', () => {
  it('nonEmpty: null no vazio, a mesma sequência caso contrário', () => {
    expect(nonEmpty([])).toBeNull();
    expect(nonEmpty(['a'])).toEqual(['a']);
    expect(nonEmpty(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('atLeastTwo: null com menos de 2, a mesma sequência caso contrário', () => {
    expect(atLeastTwo([])).toBeNull();
    expect(atLeastTwo(['a'])).toBeNull();
    expect(atLeastTwo(['a', 'b'])).toEqual(['a', 'b']);
    expect(atLeastTwo(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });
});
