import { requestContext } from '../requestContext';

describe('requestContext', () => {
  it('returns undefined outside run()', () => {
    expect(requestContext.get()).toBeUndefined();
  });

  it('keeps the context across await inside run()', async () => {
    const ctx = { requestId: 'req-1', method: 'GET', route: '/api/x' };
    const seen = await requestContext.run(ctx, async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return requestContext.get();
    });
    expect(seen).toBe(ctx);
    expect(requestContext.get()).toBeUndefined();
  });
});
