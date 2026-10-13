import { act, renderHook } from '@testing-library/react';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

describe('UT-HU11-03: useDebouncedValue', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  type Props = { v: string; d?: number };
  const montar = (valor: string, delay?: number) =>
    renderHook<string, Props>(({ v, d }) => useDebouncedValue(v, d), {
      initialProps: { v: valor, d: delay },
    });

  it('1. devuelve el valor inicial de inmediato', () => {
    const { result } = montar('abc');
    expect(result.current).toBe('abc');
  });

  it('2. no actualiza el valor antes de 300 ms', () => {
    const { result, rerender } = montar('a');
    rerender({ v: 'ab' });
    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current).toBe('a');
  });

  it('3. actualiza el valor al cumplirse los 300 ms', () => {
    const { result, rerender } = montar('a');
    rerender({ v: 'ab' });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe('ab');
  });

  it('4. con cambios rápidos solo aplica el último valor', () => {
    const { result, rerender } = montar('');
    rerender({ v: 'l' });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    rerender({ v: 'lo' });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    rerender({ v: 'lop' });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe('lop');
  });

  it('5. respeta un retardo personalizado', () => {
    const { result, rerender } = montar('a', 1000);
    rerender({ v: 'b', d: 1000 });
    act(() => {
      jest.advanceTimersByTime(999);
    });
    expect(result.current).toBe('a');
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('b');
  });
});