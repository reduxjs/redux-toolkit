const { resolve } = require('path');

const { linkDocblocks, transpileCodeblocks } = require('remark-typescript-tools');

module.exports = {
  title: 'Powerful data fetching and caching for everyone',
  tagline:
    'Caching and network request management can be very hard. We make it easy so you can spend more time focusing on your product.',
  url: 'https://rtk-query-docs.netlify.app/',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  favicon: 'img/favicon.ico',
  organizationName: 'rtk-incubator', // Usually your GitHub org/user name.
  projectName: 'rtk-query', // Usually your repo name.
  themeConfig: {
    navbar: {
      title: 'RTK Query',
      logo: {
        alt: 'RTK Query Logo',
        src: 'img/redux.svg',
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
          href: 'https://github.com/rtk-incubator/rtk-query',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Resources',
          items: [
            {
              label: 'Quick Start',
              to: '/introduction/quick-start',
            },
            { label: 'API Reference', to: '/api/createApi' },
            { label: 'Examples', to: '/examples/react-hooks' },
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
              href: 'https://github.com/rtk-incubator/rtk-query',
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
          include: ['{api,assets,concepts,introduction,examples}/*.{md,mdx}'],
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl: 'https://github.com/rtk-incubator/simple-query/edit/main/docs',
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
