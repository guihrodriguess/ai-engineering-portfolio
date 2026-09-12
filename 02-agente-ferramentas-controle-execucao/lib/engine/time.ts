/**
 * sleep que respeita AbortSignal — usado pelas ferramentas mock para
 * simular latência de sistemas downstream. Quando o timeout do
 * `withControls` dispara o abort, a promise rejeita imediatamente em vez de
 * esperar o delay inteiro.
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}
