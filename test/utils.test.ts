import { stripFileExtension } from '../src/utils';

describe('stripFileExtension', () => {
  it('should strip js and ts file extensions from possible input paths', async () => {
    const testFileInputs = [
      './whatever/output.ts',
      './whatever/output.js',
      'whatever/output.ts',
      './whatever.ts/output.ts',
      './no/file/name',
      '../hello.ts',
      'banana.js',
      'banana',
      './banana',
    ];

    for (const path of testFileInputs) {
      const stripped = stripFileExtension(path);
      const hasExt = stripped.endsWith('.js') || stripped.endsWith('.ts');

      expect(hasExt).toBeFalsy();
    }
  });
});
