// Auto-generated file - do not edit manually

import * as v from "@party-stack/ontology/values";

/** A mailing address. */
export type Address = {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
};

/** A blog author. */
export type Author = {
    authorId: string;
    name: string;
    email: string;
    bio?: string;
    /** The author's profile picture. */
    avatar?: v.attachment;
    address?: Address;
    createdAt: v.timestamp;
};

/** A blog post. */
export type Post = {
    postId: string;
    title: string;
    body: string;
    authorId: string;
    status: "draft" | "published" | "archived";
    coverImage?: v.attachment;
    tags: Array<string>;
    createdAt: v.timestamp;
    publishedAt?: v.timestamp;
};

/** A comment on a blog post. */
export type Comment = {
    commentId: string;
    body: string;
    postId: string;
    authorId: string;
    createdAt: v.timestamp;
};

export type CreatePostParameters = {
    postId?: string;
    author: string;
    title: string;
    body: string;
    status: "draft" | "published" | "archived";
    tags: Array<string>;
    createdAt?: v.timestamp;
};
export type SearchPostsParameters = {
    query: string;
    limit?: v.integer | undefined;
};
/** Search blog posts by query text. */
export type SearchPostsReturn = Array<string>;
export type BlogOntology = {
    objectTypes: {
        Author: Author;
        Post: Post;
        Comment: Comment;
    };
    linkTypes: {
        Author: {
            posts: {
                target: "Post";
                cardinality: "many";
            };
            comment: {
                target: "Comment";
                cardinality: "one";
            };
        };
        Post: {
            author: {
                target: "Author";
                cardinality: "one";
            };
            comments: {
                target: "Comment";
                cardinality: "many";
            };
        };
        Comment: {
            post: {
                target: "Post";
                cardinality: "one";
            };
            author: {
                target: "Author";
                cardinality: "many";
            };
        };
    };
    actionTypes: {
        createPost: {
            parameters: CreatePostParameters;
        };
    };
    queryFunctionTypes: {
        searchPosts: {
            parameters: SearchPostsParameters;
            returnType: SearchPostsReturn;
        };
    };
};
