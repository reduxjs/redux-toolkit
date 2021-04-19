const { resolve } = require('path');

const { linkDocblocks, transpileCodeblocks } = require('remark-typescript-tools');

module.exports = {
  title: 'RTK Query',
  tagline: 'Powerful data fetching and caching for Redux',
  url: 'https://rtk-query-docs.netlify.app/',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  favicon: 'img/favicon.ico',
  organizationName: 'rtk-incubator', // Usually your GitHub org/user name.
  projectName: 'rtk-query', // Usually your repo name.
  themeConfig: {
    metadatas: [{ name: 'twitter:card', content: 'summary' }],
    algolia: {
      apiKey: '59c7887d3d06cf3e4d774d2caf0dcb4b',
      indexName: 'rtk-query-docs',

      searchParameters: {},
    },
    image: 'img/redux-logo-landscape.png',
    navbar: {
      title: 'RTK Query',
      logo: {
        alt: 'RTK Query Logo',
        src: 'img/redux.svg',
      },
      items: [
        {
          to: 'introduction/getting-started',
          label: 'Getting Started',
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
    prism: {
      theme: require('./src/js/monokaiTheme.js'),
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Resources',
          items: [
            {
              label: 'Getting Started',
              to: '/introduction/getting-started',
            },
            { label: 'Video Overview', to: '/introduction/video-overview' },
            { label: 'API Reference', to: '/api/createApi' },
            { label: 'Examples', to: '/examples/examples-overview' },
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
              href: 'https://discord.gg/0ZcbPKXt5bZ6au5t',
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
      copyright: `Copyright © ${new Date().getFullYear()} Redux development team`,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          path: '../docs',
          include: ['{api,assets,concepts,introduction,examples}/**/*.{md,mdx}'],
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl: 'https://github.com/rtk-incubator/rtk-query/edit/main/docs',
          remarkPlugins: [
            [
              linkDocblocks,
              {
                extractorSettings: {
                  tsconfig: resolve(__dirname, '../docs/tsconfig.json'),
                  basedir: resolve(__dirname, '../src'),
                  rootFiles: ['index.ts', 'react.ts', 'react-hooks/ApiProvider.tsx'],
                },
              },
            ],
            [
              transpileCodeblocks,
              {
                compilerSettings: {
                  tsconfig: resolve(__dirname, '../docs/tsconfig.json'),
                  externalResolutions: {
                    '@rtk-incubator/rtk-query': {
                      resolvedPath: resolve(__dirname, '../src'),
                      packageId: {
                        name: '@rtk-incubator/rtk-query',
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
