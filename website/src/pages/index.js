import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

const features = [
  {
    title: 'Simple and Effective',
    imageUrl: 'img/hand.svg',
    description: (
      <>
        RTK Query is a <b>simple to use data fetching and caching library</b> that solves the majority of use cases,
        with advanced configuration options to fit your needs
      </>
    ),
  },
  {
    title: 'Built on Redux',
    imageUrl: 'img/redux.svg',
    description: (
      <>
        RTK Query is <b>built on top of Redux Toolkit</b>, so it integrates with the Redux ecosystem and DevTools
      </>
    ),
  },
  {
    title: 'Framework Agnostic',
    imageUrl: 'img/checklist.svg',
    description: (
      <>
        RTK Query <b>runs anywhere Redux runs</b> and isn't limited to React. RTK Query <b>provides React Hooks</b> for
        convenience, and it's a breeze to <b>integrate with Svelte, Vue, or any other framework of your choice</b>.
      </>
    ),
  },
  {
    title: 'Developer Experience',
    imageUrl: 'img/brain.svg',
    description: (
      <>
        RTK Query is <b>built entirely with TypeScript</b>, giving TS and JS users a first-class experience out of the
        box, and comes with opinionated defaults for common patterns.
      </>
    ),
  },
];

function Feature({ imageUrl, title, description }) {
  const imgUrl = useBaseUrl(imageUrl);
  return (
    <div className={clsx('col col--3 text--center', styles.feature)}>
      {imgUrl && (
        <div className="text--center">
          <img className={styles.featureImage} src={imgUrl} alt={title} />
        </div>
      )}
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

const featuresToPaths = {
  'Supports any protocol': null,
  'Declarative API definitions': '/api/createApi#createapi',
  Caching: '/concepts/queries#avoiding-unnecessary-requests',
  'Automatic re-fetching': '/concepts/mutations#advanced-mutations-with-revalidation',
  Polling: '/concepts/polling',
  'Parallel queries': '',
  'Dependent queries': '/concepts/conditional-fetching',
  'Paginated queries': '/concepts/pagination',
  'Skip queries': '/concepts/conditional-fetching',
  'Lagged queries': '/concepts/conditional-fetching',
  'Automatic garbage collection': '/api/createApi#keepunuseddatafor',
  Prefetching: '/concepts/prefetching',
  'Optimistic Updates': '/concepts/optimistic-updates',
  'Auto-generated React Hooks': '/api/createApi#auto-generated-hooks',
  'Runs on every framework': null,
  'Built with TypeScript': null,
};

const Checkmark = () => {
  return (
    <svg className={styles.checkmark} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
      <circle className={styles.checkmark__circle} cx="26" cy="26" r="25" fill="none" />
      <path className={styles.checkmark__check} fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
    </svg>
  );
};

function LibFeature({ title, link }) {
  return (
    <div className={clsx('col col--3 text--left', styles.feature)}>
      <p>
        <Checkmark /> {link ? <Link to={link}>{title}</Link> : title}
      </p>
    </div>
  );
}

function Home() {
  const context = useDocusaurusContext();
  const { siteConfig = {} } = context;
  return (
    <Layout
      title={`${siteConfig.title} - ${siteConfig.tagline}`}
      description="RTK Query is an advanced data fetching and caching tool, designed to simplify common cases for loading data in a web application."
    >
      <header className={clsx('hero hero--primary', styles.heroBanner)}>
        <div className="container">
          <h1 className="hero__title">{siteConfig.title}</h1>
          <h2 className="hero__subtitle">{siteConfig.tagline}</h2>
          <p className="hero__subtitle">
            Caching and network request management can be hard. RTK Query simplifies data fetching so you can focus on
            building your product.
          </p>
          <div className={styles.buttons}>
            <Link
              className={clsx('button button--secondary button--lg', styles.getStarted)}
              to={useBaseUrl('introduction/getting-started')}
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>
      <main>
        {features && features.length > 0 && (
          <section className={styles.features}>
            <div className="container">
              <div className="row">
                {features.map((props, idx) => (
                  <Feature key={idx} {...props} />
                ))}
              </div>
            </div>
          </section>
        )}
        <section className={`${styles.features} ${styles.grayBg}`}>
          <div className="container">
            <div>
              <h2 className="text--center">Features</h2>
            </div>
            <div className={`row text--center`}>
              {Object.entries(featuresToPaths).map(([title, link], idx) => (
                <LibFeature key={idx} title={title} link={link} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}

export default Home;
