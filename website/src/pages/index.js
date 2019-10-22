/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import classnames from 'classnames';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

const siteConfig = require(`../../docusaurus.config.js`)

const features = [
  {
    content: <p>Includes utilities to simplify common use cases like <strong>store setup, creating reducers, immutable update logic</strong>, and more.</p>,
    image: imgUrl('noun_snap_1984955.svg'),
    imageAlign: 'top',
    title: 'Simple'
  },
  {
    content: <p>Provides <strong>good defaults for store setup out of the box</strong>, and includes <strong>the most commonly used Redux addons built-in</strong>.</p>,
    image: imgUrl('noun_Brain_1551075.svg'),
    imageAlign: 'top',
    title: 'Opinionated'
  },
  {
    content: <p>Takes inspiration from libraries like Immer and Autodux to let you <strong>write "mutative" immutable update logic</strong>, and even <strong>create entire "slices" of state automatically</strong>.</p>,
    image: imgUrl('noun_Bicep_1338504.svg'),
    imageAlign: 'top',
    title: 'Powerful'
  },
  {
    content: <p>Lets you focus on the core logic your app needs, so you can <strong>do more work with less code</strong>.</p>,
    image: imgUrl('noun_Checklist_437165.svg'),
    imageAlign: 'top',
    title: 'Effective'
  }
];

const otherLiraries = [
  {
    content: 'A predictable state container for JavaScript applications',
    title: 'Redux',
    link: 'https://redux.js.org',
    image: 'img/external-link-square-alt-solid.svg'
  },
  {
    content: 'Official React bindings for Redux',
    title: 'React-Redux',
    link: 'https://react-redux.js.org',
    image: 'img/external-link-square-alt-solid.svg'
  }
];

function Home() {
  const context = useDocusaurusContext();
  const { siteConfig = {} } = context;

  return (
    <Layout
      title={siteConfig.title}
      description={siteConfig.tagline}
    >
      <header className={classnames('hero hero--primary', styles.heroBanner)}>
        <div className="container">
          <div className={styles.title}>
            <img src="img/redux_white.svg" alt="Redux logo" width="100" height="100" />
            <h1 className={`${styles.projectTitle} hero__title`}>{siteConfig.title}</h1>
          </div>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
          <div className={styles.buttons}>
            <Link
              className={classnames(
                'button button--secondary button--lg',
                styles.getStarted,
              )}
              to={useBaseUrl('introduction/quick-start')}
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>
      <main>
        {features && features.length && (
          <section className={[styles.features, styles.lightBackground].join(' ')}>
            <div className={`container ${styles.featureBlock}`}>
              <div className="row">
                {features.map(({ image, title, content }, idx) => (
                  <div
                    key={idx}
                    className={classnames('col col--3', styles.feature)}
                  >
                    {image && (
                      <div className={`text--center ${styles.blockImage}`}>
                        <img
                          className={styles.featureImage}
                          src={useBaseUrl(image)}
                          alt={title}
                        />
                      </div>
                    )}
                    <h2 className={`text--center ${styles.featureTitle}`}>{title}</h2>
                    {content}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
        {otherLiraries && otherLiraries.length && (
          <section className={styles.features}>
            <div className="container">
              <div className="row">
                <div className="col">
                  <h2 className={`text--center ${styles.secondTitle}`}>Other Libraries from the Redux Team</h2>
                </div>
              </div>
              <div className="row">
                {otherLiraries.map(({ image, title, content, link }, idx) => (
                  <div key={idx} className={classnames('col col--6', styles.feature)}>
                    <h2 className="text--center">
                      <a href={link}>
                        {title}
                        <img className={styles.libLinkImg} src={image} />
                      </a>
                    </h2>
                    <p className="text--center">{content}</p>
                  </div> 
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </Layout>
  );
}

function docUrl(doc, language) {
  return `${siteConfig.baseUrl}${language ? `${language}/` : ''}${doc}`
}

function imgUrl(img) {
  return `${siteConfig.baseUrl}img/${img}`
}

export default Home;
