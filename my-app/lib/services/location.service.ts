interface CepDataResponse { cep?: string; logradouro?: string; localidade?: string; uf?: string; [key: string]: unknown }

/** BRD F-72.4 (decisão do dono, 10/11): 10 s de limite para o ViaCEP. */
export const VIACEP_TIMEOUT_MS = 10_000;

export const LocationService = {
  async fetchCepData(cep: string): Promise<CepDataResponse> {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) throw new Error('CEP inválido');

    // External API bypasses ApiClient to avoid interceptors/headers
    let response: Response;
    try {
      response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, { signal: AbortSignal.timeout(VIACEP_TIMEOUT_MS) });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new Error('A busca do CEP demorou demais. Tente de novo.');
      }
      throw error;
    }
    if (!response.ok) throw new Error('Falha ao buscar CEP');

    return response.json();
  }
};
