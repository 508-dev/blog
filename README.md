# blog

508.dev's blog.

## Local Development

1. Ensure you have `hugo` installed. See: https://gohugo.io/getting-started/quick-start/
2. Clone this repo
3. In the new directory to which you cloned this repo, you can run `hugo serve` to create a local webserver running on `localhost:1313`, where you can view a hot-reloading version of the blog.

## Deployment

This blog is hosted on Github Pages. Upon a merge to the `main` branch, a Github Action is triggered that re-runs `hugo`, which rebuilds the blog and serves its static directory. If for some reason you want to create your own static deployment, run `hugo` and then put the contents of the `public` directory in a static hosting provider somewhere.

## Writing a Blog Post

After following the steps in Local Development, open a new terminal window.

1. Create a new git branch for your post.
2. Run `hugo new content posts/your-post-title.md`
3. Open the newly created file, `posts/your-post-title.md`
4. Modify the frontmatter as needed. See: https://pre.fixit.lruihao.cn/documentation/content-management/introduction/ Important: Make sure to include your author info so you properly receive credit for the post!
5. Write your blog post using Markdown syntax. See https://pre.fixit.lruihao.cn/documentation/content-management/markdown-syntax/
6. When you're done writing, commit your changes and issues a pull request on codeberg.
