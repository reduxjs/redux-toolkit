/**
 * DisposableIfAvailable
 * 
 * The explicit resource management TC39 proposal introduces a new symbol
 * `symbol.dispose` that can be used to mark objects as disposable.
 * 
 * It's important that this type can be compiled in older TypeScript versions
 * that don't include the symbol so consumers of the library don't face type
 * errors.
 * 
 * At compile time DisposableIfAvailable will be either:
 * 
 * - `{ [Symbol.dispose]: () => void }` if the symbol is defined
 * - `{}` if the symbol is not defined
 */
type DisposeSymbolType = SymbolConstructor extends { dispose: symbol }
  ? typeof Symbol['dispose']
  : 'unused-literal'

// Explicit any can be removed once this library is upgraded to TypeScript 5.2
const disposeSymbol: DisposeSymbolType = (Symbol as any)['dispose']
export type DisposableIfAvailable = SymbolConstructor extends {
  dispose: symbol
}
  ? { [disposeSymbol]: () => void }
  : {}

/**
 * At runtime check for the existence of Symbol.dispose and if available return
 * an object with a dispose method.
 * 
 * This needs to be a runtime check as the symbol is not available in every environment.
 */
export const disposableIfAvailable = (
  disposeFn: () => void
): DisposableIfAvailable => {
  
  // Explicit any can be removed once we upgrade to TypeScript 5.2
  const dispose: DisposeSymbolType = (Symbol as any)['dispose']
  if (dispose) {
    return {
      [dispose]: () => disposeFn(),
    }
  }
  return {} as DisposableIfAvailable
}
