import { describe, it, expect, vi } from 'vitest';

describe('Response helpers', () => {
  it('respondSuccess returns correct envelope', async () => {
    const { respondSuccess } = await import('../../helpers/response.js');
    const res: any = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
    respondSuccess(res, { foo: 'bar' });
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { foo: 'bar' } });
  });

  it('respondError returns correct envelope with status code', async () => {
    const { respondError } = await import('../../helpers/response.js');
    const res: any = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
    respondError(res, 'Something went wrong', 422);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Something went wrong', code: 422 });
  });
});
