const { resolve } = require('path');

const { linkDocblocks, transpileCodeblocks } = require('remark-typescript-tools');

module.exports = {
  title: 'Simple Query',
  tagline: 'A simple data fetching & caching library built on redux-toolkit',
  url: 'https://simple-query.js.org',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  favicon: 'img/favicon.ico',
  organizationName: 'rtk-incubator', // Usually your GitHub org/user name.
  projectName: 'simple-query', // Usually your repo name.
  themeConfig: {
    navbar: {
      title: 'Simple Query',
      logo: {
        alt: 'Simple Query Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          to: 'introduction/quick-start',
          label: 'Quick Start',
          position: 'right',
        },
        {
          to: 'api/createApi',
          label: 'API',
          position: 'right',
        },
        // { to: 'blog', label: 'Blog', position: 'left' },
        {
          href: 'https://github.com/rtk-incubator/simple-query',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            // {
            //   label: 'Style Guide',
            //   to: 'docs/',
            // },
            // {
            //   label: 'Second Doc',
            //   to: 'docs/doc2/',
            // },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/redux-toolkit',
            },
            {
              label: 'Discord',
              href: 'https://discordapp.com/invite/reactiflux',
            },
            // {
            //   label: 'Twitter',
            //   href: 'https://twitter.com/docusaurus',
            // },
          ],
        },
        {
          title: 'More',
          items: [
            // {
            //   label: 'Blog',
            //   to: 'blog',
            // },
            {
              label: 'GitHub',
              href: 'https://github.com/rtk-incubator/simple-query',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} RTK Incubator.`,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          path: '../docs',
          include: ['{api,assets,introduction,tutorials,usage}/*.{md,mdx}'],
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          // editUrl: 'https://github.com/rtk-incubator/simple-query',
          remarkPlugins: [
            [
              linkDocblocks,
              {
                extractorSettings: {
                  tsconfig: resolve(__dirname, '../docs/tsconfig.json'),
                  basedir: resolve(__dirname, '../src'),
                  rootFiles: ['index.ts'],
                },
              },
            ],
            [
              transpileCodeblocks,
              {
                compilerSettings: {
                  tsconfig: resolve(__dirname, '../docs/tsconfig.json'),
                  externalResolutions: {
                    '@rtk-incubator/simple-query': {
                      resolvedPath: resolve(__dirname, '../src'),
                      packageId: {
                        name: '@rtk-incubator/simple-query',
                        subModuleName: 'index.ts',
                        version: '1.0',
                      },
                    },
                  },
                },
              },
            ],
          ],
        },
        // blog: {
        //   showReadingTime: true,
        //   // Please change this to your repo.
        //   editUrl: 'https://github.com/facebook/docusaurus/edit/master/website/blog/',
        // },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
