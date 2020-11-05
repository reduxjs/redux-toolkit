#!/usr/bin/env bash

for example in examples/*; do (
    cd "$example" && test -f package.json || exit 0
    yarn install
    mkdir -p node_modules/@rtk-incubator/simple-query/dist
    rm -r node_modules/@rtk-incubator/simple-query/dist
    ln -sv ../../../../../dist node_modules/@rtk-incubator/simple-query/dist
) done