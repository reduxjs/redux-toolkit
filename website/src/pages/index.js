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
    imageUrl: 'img/undraw_docusaurus_mountain.svg',
    description: (
      <>
        RTK Query was designed as an advanced, yet simple to use data fetching and caching library that solves the
        majority of use cases.
      </>
    ),
  },
  {
    title: 'Developer Experience',
    imageUrl: 'img/undraw_docusaurus_tree.svg',
    description: (
      <>RTK Query was built entirely with TypeScript, giving TS and JS users a first-class experience out of the box.</>
    ),
  },
  {
    title: 'Framework Agnostic',
    imageUrl: 'img/undraw_docusaurus_react.svg',
    description: (
      <>
        RTK Query runs anywhere Redux runs and isn't limited to React. Although RTK Query provides React Hooks for
        convenience, it's a breeze to integrate with Svelte, Vue, or any other framework of your choice.
      </>
    ),
  },
];

function Feature({ imageUrl, title, description }) {
  const imgUrl = useBaseUrl(imageUrl);
  return (
    <div className={clsx('col col--4 text--center', styles.feature)}>
      {imgUrl && (
        <div className="text--center">
          <img className={styles.featureImage} src={imgUrl} alt={title} />
        </div>
      )}
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

const libFeatures = [
  'Supports any protocol',
  'Declarative API definitions',
  'Caching',
  'Automatic re-fetching',
  'Polling',
  'Parallel queries',
  'Dependent queries',
  'Paginated queries',
  'Skip queries',
  'Lagged queries',
  'Automatic garbage collection',
  'Prefetching',
  'Runs on every framework',
  'Transport and protocol agnostic',
  'Built with TypeScript',
];

const Checkmark = () => {
  return (
    <svg className={styles.checkmark} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
      <circle className={styles.checkmark__circle} cx="26" cy="26" r="25" fill="none" />
      <path className={styles.checkmark__check} fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
    </svg>
  );
};
function LibFeature({ title }) {
  return (
    <div className={clsx('col col--3 text--left', styles.feature)}>
      <p>
        <Checkmark /> {title}
      </p>
    </div>
  );
}

function Home() {
  const context = useDocusaurusContext();
  const { siteConfig = {} } = context;
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="RTK Query is an advanced data fetching and caching tool, designed to simplify common cases for loading data in a web application."
    >
      <header className={clsx('hero hero--primary', styles.heroBanner)}>
        <div className="container">
          <h1 className="hero__title">{siteConfig.title}</h1>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
          <div className={styles.buttons}>
            <Link
              className={clsx('button button--secondary button--lg', styles.getStarted)}
              to={useBaseUrl('introduction/quick-start')}
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
              {libFeatures.map((title, idx) => (
                <LibFeature key={idx} title={title} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}

export default Home;
