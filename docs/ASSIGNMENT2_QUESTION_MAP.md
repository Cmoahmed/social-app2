# Assignment 2 question map

Questions 1–10 are implemented and verified. The matching Vitest scenarios passed, and Newman passed all 102 assertions in the Assignment 2 collection against the compiled backend and an isolated MongoDB instance.

| Question | Operation | Implementation | HTTP route | Automated test scenario | Postman request |
| --- | --- | --- | --- | --- | --- |
| 1 | Create Post | [posts/service.ts](../src/modules/posts/service.ts) · `createPost` | `POST /api/posts` | Persist author, validate content and authentication | A creates the main post |
| 2 | Get All Posts | [posts/service.ts](../src/modules/posts/service.ts) · `listPosts` | `GET /api/posts` | Own-post filtering, newest first, empty list | A lists only their own posts |
| 3 | Get Single Post | [posts/service.ts](../src/modules/posts/service.ts) · `getPost` | `GET /api/posts/:postId` | Public/private access, invalid and missing IDs | B retrieves A’s public post |
| 4 | Update Post | [posts/service.ts](../src/modules/posts/service.ts) · `updatePost` | `PATCH /api/posts/:postId` | Owner restriction, protected fields, timestamp | A edits their post |
| 5 | Delete Post | [posts/service.ts](../src/modules/posts/service.ts) · `deletePost` | `DELETE /api/posts/:postId` | Ownership, physical cascade, retry, late insert | A deletes the cleanup post |
| 6 | Create Comment | [comments/service.ts](../src/modules/comments/service.ts) · `createComment` | `POST /api/posts/:postId/comments` | Persist author/parent, validate content, enforce parent access | B comments on A’s post |
| 7 | Get Post Comments | [comments/service.ts](../src/modules/comments/service.ts) · `listComments` | `GET /api/posts/:postId/comments` | Parent filtering, order, empty list, private access | List comments on A’s post |
| 8 | Get Single Comment | [comments/service.ts](../src/modules/comments/service.ts) · `getComment` | `GET /api/comments/:commentId` | Invalid and missing IDs, private and deleted parent | Read B’s comment by ID |
| 9 | Update Comment | [comments/service.ts](../src/modules/comments/service.ts) · `updateComment` | `PATCH /api/comments/:commentId` | Author edit, post owner and unrelated user denied, protected parent | B edits their comment |
| 10 | Delete Comment | [comments/service.ts](../src/modules/comments/service.ts) · `deleteComment` | `DELETE /api/comments/:commentId` | Comment author and post owner allowed, other users denied | Comment author B deletes their comment, Post owner A deletes B’s comment |

[Vitest suite](../tests/assignment2.test.ts) · [Postman collection](../postman/Assignment2_Posts_Comments.postman_collection.json) · [Testing guide](ASSIGNMENT2_TESTING.md)
