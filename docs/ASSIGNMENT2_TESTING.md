# Assignment 2 testing

## Start the app on Windows

1. Start the local MongoDB service in Windows Services if it is stopped. The configured database URI is `mongodb://127.0.0.1:27017/social_app_course`.
2. From the project directory, run `npm.cmd run dev` and open `http://localhost:3000/api/health`. Expect HTTP 200 and `{"success":true,"data":{"status":"ok"}}`. Mongoose initializes the two collections and their indexes on startup.
3. Reuse three verified disposable accounts with User A initially public. If you need accounts, start Mailpit using the existing [setup guide](SETUP_AND_TESTING.md), register three distinct users through `POST /api/auth/register`, and verify each through `POST /api/auth/verify-email` using `{"credential":"<value from Mailpit>"}`. A registration body looks like `{"email":"assignment2-a@example.test","username":"assignment2_a","password":"Example-course-password-123"}`. Use your own disposable credentials.

## Run the Postman requests

1. Click **Import** and select [the Assignment 2 collection](../postman/Assignment2_Posts_Comments.postman_collection.json) and [the local environment](../postman/Assignment2_Local.postman_environment.json). Select **Assignment 2 Local (example)** and set `baseUrl` to `http://localhost:3000` or your running backend URL. Set `emailA`, `emailB`, `emailC`, `passwordA`, `passwordB`, and `passwordC` to local values for the three accounts. Keep the populated environment private. [Postman import instructions](https://learning.postman.com/docs/getting-started/importing-and-exporting/importing-data/)
2. **01 - Authentication Setup**. Send the three login requests. Each sends the account’s email and password to `POST /api/auth/login` and expects 200. The scripts save `data.accessToken` and `data.userId` for A, B, and C. All ten CRUD routes require a Bearer access token.
3. **02 - Post CRUD**. Send **A creates the main post** with `{"content":"Assignment 2 main post"}`. Expect 201 with `{"success":true,"data":{"_id":"<post ID>","author":"<A ID>","content":"Assignment 2 main post","createdAt":"<ISO date>","updatedAt":"<ISO date>"}}`. The script saves `data._id` as `postAId`. Create B’s post, list A’s posts, and read A’s post as B. The list is `{"success":true,"data":[...]}`, newest first, and excludes B’s post. A’s edit with `{"content":"Edited main post"}` returns 200 with the new content. B’s attempt to edit and C’s attempt to delete A’s post return 403. B deletes their own separate post with 204 and an empty body.
4. **03 - Comment CRUD**. B adds `{"content":"B’s comment"}` to `/api/posts/{{postAId}}/comments`. Expect 201 with the same resource envelope plus `data.post` equal to `postAId` and `data.author` equal to `userBId`. The script saves `data._id` as `commentBId`. A’s comment is captured as `commentAId`. List comments oldest first and retrieve B’s comment by ID. B’s edit with `{"content":"Edited comment"}` returns 200. A and C receive 403 for the same edit. Follow the order to test deletion by B, deletion by A of a newly created comment, and C’s 403 for a third comment. Successful deletions return 204.
5. **04 - Ownership and Security**. Protected field attempts return 400. The folder temporarily makes A private, tests C’s access to the post and comments, and restores A to public. Existing privacy rules permit the owner and accepted followers to read a private account’s posts and comments and create comments on those posts. If you stop mid-folder, send **Restore A’s public visibility** before rerunning.
6. **05 - Delete and Relationship Cleanup**. Create the disposable post and its comment, read the comment, then delete the post. The follow-up reads and creation against the deleted records return 404. The folder also deletes the main post and its remaining comments. If you stop early, use the saved IDs and the relevant owner’s deletion request before restarting. Reuse the same three accounts.
7. Use **Test Results** after an individual request. For an end-to-end check, select the Assignment 2 folder and use **Run** with the local environment, one iteration, and the default order. Expect 51 requests and 102 passing assertions. Expected 400, 401, 403 and 404 responses count as passes when the status and error envelope match. [Postman Runner instructions](https://learning.postman.com/docs/tests-and-scripts/run-tests/run-tests-manually)

## Check records in MongoDB Compass

1. Open Compass, choose **Add New Connection**, paste `mongodb://127.0.0.1:27017/social_app_course`, and choose **Connect**. Expand `social_app_course`. [Compass connection instructions](https://www.mongodb.com/docs/compass/connect/)
2. Before running cleanup, open **posts → Documents**. Paste `{ _id: ObjectId("<postAId>") }` in **Filter**, substitute the saved value, and click **Find**. Compare `author` with `userAId`. Check `content`, `createdAt`, and `updatedAt` before and after A’s PATCH. Refresh the query to see the new content and later `updatedAt`.
3. Open **comments → Documents** and filter with `{ post: ObjectId("<postAId>") }`. Check that B’s comment has `author` equal to `userBId` and `post` equal to `postAId`. After deleting one comment, filter by `{ _id: ObjectId("<deleted comment ID>") }` and verify zero results.
4. In folder 05, pause before deleting the cleanup post. Use `{ post: ObjectId("<cleanupPostId>") }` to find its comment. After deletion, rerun that filter and check for zero results. In **posts**, `{ _id: ObjectId("<cleanupPostId>") }` should also return zero results.
5. Open **Indexes** in each collection. Expect the default `_id_` and the compound index `{ author: 1, createdAt: -1, _id: -1 }` for posts or `{ post: 1, createdAt: 1, _id: 1 }` for comments. Use the API requests to generate the records you inspect.

## Run the automated checks

```powershell
npm.cmd run typecheck
npm.cmd run build
$env:MONGOMS_SYSTEM_BINARY = 'C:/Program Files/MongoDB/Server/9.0/bin/mongod.exe'
npm.cmd test
npm.cmd run validate:artifacts
npm.cmd run smoke
```

Set `MONGOMS_SYSTEM_BINARY` to your installed executable, or omit it to let MongoDB Memory Server resolve its own binary. The test suites use isolated MongoDB instances by default. The smoke command starts the compiled app against the configured local development database on a temporary HTTP port and checks startup, health, and error handling.

Post deletion marks the post as deleting, removes its comments, then removes the post. While cleanup is pending, ordinary reads respond with 404. If cleanup returns 500, the owner can retry the same DELETE. The steps are separate MongoDB writes. Comment creation rechecks the parent after insertion and removes a late insert if the post disappeared during the request. An interruption between a late insert and its removal can leave an inaccessible comment record.
