import { createPrettierConfig } from '@reduxjs/prettier-config';

export default createPrettierConfig({
  printWidth: 120,
  semi: true,
  trailingComma: 'es5',
});
