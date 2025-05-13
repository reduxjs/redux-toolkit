<p align="center">
  <img src="https://raw.githubusercontent.com/rtk-incubator/rtk-query/main/logo.png" width="400" />
</p>
<h2 align="center">
Code Generator (adjusted by TimT)
</h2>

### Introduction

This is an update of the utility library meant to be used with [RTK Query](https://redux-toolkit.js.org/rtk-query/overview) that will generate a typed API client from an OpenAPI schema.

### Documentation

[View the RTK Query Code Generation docs](https://redux-toolkit.js.org/rtk-query/usage/code-generation)

### Additions

We added two small additions to the original package: added option to make all DTO variables required and to convert properties of format "uuid" to a custom Guid object.