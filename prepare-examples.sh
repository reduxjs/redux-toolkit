#!/usr/bin/env bash

for example in examples/*; do (
    cd "$example" && test -f package.json || exit 0
    yarn install
    mkdir -p node_modules/@rtk-incubator/simple-query/dist
    rm -r node_modules/@rtk-incubator/simple-query/dist
    ln -sv ../../../../../dist node_modules/@rtk-incubator/simple-query/dist
    rm -r node_modules/react node_modules/react-redux
    ln -sv ../../../../../node_modules/react node_modules/react
    ln -sv ../../../../../node_modules/react-redux node_modules/react-redux
) done