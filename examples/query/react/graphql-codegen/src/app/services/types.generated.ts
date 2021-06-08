export type Maybe<T> = T;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
};

export type IdQueryType = {
  equals?: Maybe<Scalars['ID']>;
  notEquals?: Maybe<Scalars['ID']>;
  contains?: Maybe<Scalars['ID']>;
  notContains?: Maybe<Scalars['ID']>;
  in?: Maybe<Scalars['ID']>;
  notIn?: Maybe<Scalars['ID']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  createPost?: Maybe<Post>;
  updatePost?: Maybe<Post>;
  updatePosts?: Maybe<Array<Maybe<Post>>>;
  deletePost?: Maybe<Post>;
  deletePosts?: Maybe<Array<Maybe<Post>>>;
};


export type MutationCreatePostArgs = {
  data?: Maybe<PostInput>;
};


export type MutationUpdatePostArgs = {
  where?: Maybe<PostQueryInput>;
  data?: Maybe<PostInput>;
};


export type MutationUpdatePostsArgs = {
  where?: Maybe<PostQueryInput>;
  data?: Maybe<PostInput>;
};


export type MutationDeletePostArgs = {
  where?: Maybe<PostQueryInput>;
};


export type MutationDeletePostsArgs = {
  where?: Maybe<PostQueryInput>;
};

export type Post = {
  __typename?: 'Post';
  id?: Maybe<Scalars['ID']>;
  name?: Maybe<Scalars['String']>;
  title?: Maybe<Scalars['String']>;
  author?: Maybe<Scalars['String']>;
  content?: Maybe<Scalars['String']>;
  status?: Maybe<Scalars['String']>;
  created_at?: Maybe<Scalars['String']>;
  updated_at?: Maybe<Scalars['String']>;
};

export type PostInput = {
  id?: Maybe<Scalars['ID']>;
  name?: Maybe<Scalars['String']>;
  title?: Maybe<Scalars['String']>;
  author?: Maybe<Scalars['String']>;
  content?: Maybe<Scalars['String']>;
  status?: Maybe<Scalars['String']>;
  created_at?: Maybe<Scalars['String']>;
  updated_at?: Maybe<Scalars['String']>;
};

export type PostQueryInput = {
  id?: Maybe<IdQueryType>;
  name?: Maybe<StringQueryType>;
  title?: Maybe<StringQueryType>;
  author?: Maybe<StringQueryType>;
  content?: Maybe<StringQueryType>;
  status?: Maybe<StringQueryType>;
  created_at?: Maybe<StringQueryType>;
  updated_at?: Maybe<StringQueryType>;
};

export type Query = {
  __typename?: 'Query';
  post?: Maybe<Post>;
  posts?: Maybe<Array<Maybe<Post>>>;
};


export type QueryPostArgs = {
  where?: Maybe<PostQueryInput>;
};


export type QueryPostsArgs = {
  take?: Maybe<Scalars['Int']>;
  skip?: Maybe<Scalars['Int']>;
  cursor?: Maybe<Scalars['ID']>;
  where?: Maybe<PostQueryInput>;
};

export type StringQueryType = {
  equals?: Maybe<Scalars['String']>;
  notEquals?: Maybe<Scalars['String']>;
  contains?: Maybe<Scalars['String']>;
  notContains?: Maybe<Scalars['String']>;
  in?: Maybe<Scalars['String']>;
  notIn?: Maybe<Scalars['String']>;
};
