import React, { useState } from 'react';

// import the file that injects "post" to make sure it has been loaded
import '../../app/services/split/post';

/**
 * You can also just import the "combined export" of the splitApi.
 * That will contain all defined injections, but everything will
 * be potentially undefined, to remind you that you cannot know what
 * has already been injected.
 */
import { splitApi } from '../../app/services/split';

function assert(condition: any, msg = 'Generic Assertion'): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

const Post = ({ id }: { id: number }) => {
  /*
   * As accessing these conditionally will cause hooks to error out,
   * it's best to assert their existence & throw otherwise.
   * This missing would be a programming error that you should
   * catch early anyways.
   */
  assert(splitApi.endpoints.getPost?.useQuery, 'Endpoint `getPost` not loaded!');
  const { data, error } = splitApi.endpoints.getPost.useQuery(id);
  return error ? <>there was an error</> : !data ? <>loading</> : <h1>{data.name}</h1>;
};
export default Post;
